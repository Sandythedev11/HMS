from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app import create_app
from flask_cors import CORS
from flask import request, current_app

app = create_app()

# Add CORS middleware to the app with better error handling
CORS(app, 
     origins=["http://localhost:3000", "http://localhost:8080"],
     resources={r"/*": {"origins": ["http://localhost:3000", "http://localhost:8080"]}},
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     supports_credentials=False,  # This can cause issues with wildcard origins
     expose_headers=["Content-Type", "Authorization"],
     max_age=3600
)

# Add an after_request handler at the app level for redundancy
@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    allowed_origins = ['http://localhost:3000', 'http://localhost:8080']
    
    # Ensure CORS headers are present regardless of response status
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:8080'
        
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    response.headers['Access-Control-Max-Age'] = '3600'
    
    # Log the response headers for debugging
    current_app.logger.info(f"Response headers: {dict(response.headers)}")
    
    return response

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0') 