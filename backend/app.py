import os
import logging
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import json

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format=os.getenv('LOG_FORMAT', '%(asctime)s - %(levelname)s - %(message)s')
)

app = Flask(__name__)


# Configure CORS
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:8000,http://localhost:8080,http://locahost:8888').split(',')
CORS(app, resources={
    r"/*": {"origins": allowed_origins}
})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '')
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Database configuration
DB_CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME')
}

# Application configuration
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'dev-key-change-in-production'),
    DEBUG=os.getenv('FLASK_DEBUG', '0').lower() in ['true', '1', 't', 'y', 'yes']
)

def create_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
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
                    CREATE TABLE IF NOT EXISTS form_data (
                        id SERIAL PRIMARY KEY,
                        data_title VARCHAR(255) UNIQUE NOT NULL,
                        data JSONB NOT NULL,
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
        logging.info("Fetching data titles")
        conn = create_connection()
        if not conn:
            logging.error('Database connection failed')
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor()
        cursor.execute('SELECT id, data_title, created_at, updated_at FROM form_data ORDER BY updated_at DESC')
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

        logging.info(f"Attempting to fetch data for title: {title}")
        
        conn = create_connection()
        if not conn:
            logging.error('Database connection failed')
            return jsonify({'error': 'Database connection failed'}), 500

        try:
            cursor = conn.cursor()
            logging.info(f"Executing query: SELECT data FROM form_data WHERE data_title = '{title}'")
            cursor.execute('SELECT data FROM form_data WHERE data_title = %s', (title,))
            row = cursor.fetchone()
            
            if row:
                data = row[0]
                logging.info(f"Found data for title: {title}")
                # logging.info(f"Found data: {data}")
                logging.debug(f"Data content: {json.dumps(data, indent=2)}")
                response = jsonify(data)
                response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8000')
                response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
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

        conn = create_connection()
        if not conn:
            return jsonify({'error': 'Database connection failed'}), 500

        cursor = conn.cursor()
        
        # Try to update existing record with the same title
        cursor.execute('''
            INSERT INTO form_data (data_title, data, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (data_title)
            DO UPDATE SET
                data = EXCLUDED.data,
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