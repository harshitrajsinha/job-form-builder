FROM nginx:alpine

# Copy static files into Nginx html directory
COPY index.html /usr/share/nginx/html/
COPY create.html /usr/share/nginx/html/
COPY edit.html /usr/share/nginx/html/
COPY preview.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY job.png /usr/share/nginx/html/
COPY site.webmanifest /usr/share/nginx/html/

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
