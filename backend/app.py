import os
import logging
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import json
import time
from redis import Redis, Redis as RedisClient
import pickle

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format=os.getenv('LOG_FORMAT', '%(asctime)s - %(levelname)s - %(message)s')
)

app = Flask(__name__)

# Configure CORS
# if ALLOWED_ORIGINS env is null then string (2nd arg) will be used as default
allowed_origins = list(set(os.getenv('ALLOWED_ORIGINS', 'http://localhost:8888').split(',')))
CORS(app, resources={
    r"/*": {"origins": allowed_origins}
})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '')
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

# Redis configuration
REDIS_CONFIG = {
    'url': os.getenv('REDIS_URL', 'redis://:password@localhost:6379/0')
}

REDIS_ADDR = os.getenv('REDIS_ADDR')  # e.g., host:port
REDIS_PASS = os.getenv('REDIS_PASS')

# Database configuration
DB_CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME')
}

DB_URL = os.getenv('DB_URL')

# Application configuration
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'dev-key-change-in-production'),
    DEBUG=os.getenv('FLASK_DEBUG', '0').lower() in ['true', '1', 't', 'y', 'yes']
)

def create_connection():
    try:
        conn = psycopg2.connect(DB_URL)
        logging.info('Database connection established')
        return conn
    except psycopg2.Error as e:
        logging.error(f"Error connecting to database: {e}")
        return None

@app.route('/server')
def server_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/health')
def health_check():
    try:
        conn = create_connection()
        if not conn:
            logging.error('Database connection failed')
            return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500

        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        cursor.close()
        conn.close()
        
        logging.info('Health check successful')
        return jsonify({'status': 'ok'}), 200
    except Exception as e:
        logging.error(f"Error in health check: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def create_table(retries=5, delay=3):
    for attempt in range(retries):
        conn = create_connection()
        if conn:
            try:
                cursor = conn.cursor()
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS job_form (
                        id SERIAL PRIMARY KEY,
                        job_title VARCHAR(255) UNIQUE NOT NULL,
                        job_data JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                conn.commit()
                cursor.close()
                logging.info('Table created successfully')
            except psycopg2.Error as e:
                logging.error(f"Attempt {attempt+1} - Error creating table: {e}")
                time.sleep(delay)
            finally:
                conn.close()
        else:
            logging.warning(f"Attempt {attempt+1} - DB not ready, retrying in {delay}s")
            time.sleep(delay)
    logging.error("Failed to create table after several attempts")
    
@app.route('/get_data_titles', methods=['GET'])
def get_data_titles():
    try:
        # Check if data is in Redis cache
        cache_key = 'job_form_titles'
        
        # Create Redis client with URL
        # redis = Redis.from_url(url)
        host, port = REDIS_ADDR.split(':')
        redis_client = Redis(
            host=host,
            port=int(port),
            password=REDIS_PASS,
        )
        
        cached_data = redis_client.get(cache_key)
        if cached_data:
            logging.info("Fetching data titles from cache")
            data_list = pickle.loads(cached_data)
        else:
            logging.info("Fetching data titles from database")
            conn = create_connection()
            if not conn:
                logging.error('Database connection failed')
                return jsonify({'error': 'Database connection failed'}), 500

            cursor = conn.cursor()
            cursor.execute('SELECT id, job_title, created_at, updated_at FROM job_form ORDER BY updated_at DESC')
            rows = cursor.fetchall()
            
            data_list = []
            for row in rows:
                data_list.append({
                    'id': row[0],
                    'title': row[1],
                    'created_at': row[2].isoformat(),
                    'updated_at': row[3].isoformat()
                })
            
            cursor.close()
            conn.close()
            
            # Cache the data for 5 minutes (300 seconds)
            logging.info("Caching data titles to redis")
            redis_client.set(cache_key, pickle.dumps(data_list), ex=300)
        
        logging.info(f"Found {len(data_list)} titles")
        return jsonify(data_list), 200
        
    except Exception as e:
        logging.error(f"Error in get_data_titles: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_form_data', methods=['GET'])
def get_form_data():
    try:
        title = request.args.get('title')
        if not title:
            logging.error('Title parameter is required')
            return jsonify({'error': 'Title parameter is required'}), 400

        # Create Redis cache key based on title
        cache_key = f'job_form_data:{title}'
        
        # Check Redis cache first
        host, port = REDIS_ADDR.split(':')
        redis_client = Redis(
            host=host,
            port=int(port),
            password=REDIS_PASS,
        )
        
        cached_data = redis_client.get(cache_key)
        if cached_data:
            logging.info(f"Fetching data for title '{title}' from cache")
            data = pickle.loads(cached_data)
            response = jsonify(data)
            origin = request.headers.get('Origin', '')
            if origin in allowed_origins:
                response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
            return response, 200

        logging.info(f"Attempting to fetch data for title: {title}")
        
        conn = create_connection()
        if not conn:
            logging.error('Database connection failed')
            return jsonify({'error': 'Database connection failed'}), 500

        try:
            cursor = conn.cursor()
            logging.info(f"Executing query: SELECT job_data FROM job_form WHERE job_title = '{title}'")
            cursor.execute('SELECT job_data FROM job_form WHERE job_title = %s', (title,))
            row = cursor.fetchone()
            
            if row:
                data = row[0]
                logging.info(f"Found data for title: {title}")
                logging.debug(f"Data content: {json.dumps(data, indent=2)}")
                
                # Cache the data for 5 minutes
                redis_client.set(cache_key, pickle.dumps(data), ex=300)
                
                response = jsonify(data)
                origin = request.headers.get('Origin', '')
                if origin in allowed_origins:
                    response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
                return response, 200
            else:
                logging.error(f"No data found for title: {title}")
                return jsonify({'error': 'Data not found'}), 404
            
        except psycopg2.Error as db_error:
            logging.error(f"Database error: {db_error}")
            logging.error(f"Error details: {db_error.pgcode}, {db_error.pgerror}")
            return jsonify({'error': 'Database error occurred'}), 500
            
        finally:
            if 'cursor' in locals():
                cursor.close()
            conn.close()
            
    except Exception as e:
        logging.error(f"Error in get_form_data: {e}")
        logging.error(f"Error type: {type(e).__name__}")
        return jsonify({'error': str(e)}), 500

@app.route('/save_form_data', methods=['POST'])
def save_form_data():
    try:
        print("Backend: Received save request")
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        title = data.get('title')
        form_data = data.get('formData')
        
        if not title or not form_data:
            return jsonify({'error': 'Missing title or form data'}), 400

        # Invalidate Redis cache for this form data
        cache_key = f'job_form_data:{title}'
        host, port = REDIS_ADDR.split(':')
        redis_client = Redis(
            host=host,
            port=int(port),
            password=REDIS_PASS,
        )
        redis_client.delete(cache_key)
        
        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor()
        
        # Try to update existing record with the same title
        cursor.execute('''
            INSERT INTO job_form (job_title, job_data, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (job_title)
            DO UPDATE SET
                job_data = EXCLUDED.job_data,
                updated_at = EXCLUDED.updated_at
            RETURNING id
        ''', (title, json.dumps(form_data)))
        
        result = cursor.fetchone()
        if result:
            conn.commit()
            cursor.close()
            conn.close()
            return jsonify({
                'message': 'Data saved successfully',
                'id': result[0],
                'updated': result[0] is not None  # True if updated, False if inserted
            }), 200
        
        conn.rollback()
        cursor.close()
        conn.close()
        return jsonify({'error': 'Failed to save form data'}), 500
    except Exception as e:
        print("Backend: Error in save_form_data:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create database and table on startup
    create_table()
    port = int(os.getenv('FLASK_RUN_PORT', '5000'))
    debug = os.getenv('FLASK_DEBUG', '1').lower() in ['true', '1', 't', 'y', 'yes']
    app.run(host='0.0.0.0', port=port, debug=debug)