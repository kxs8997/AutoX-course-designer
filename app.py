from flask import Flask, render_template, request, jsonify, send_from_directory
from geopy.geocoders import Nominatim
import os

app = Flask(__name__)

# Add cache prevention for static files during development
@app.after_request
def add_header(response):
    # Prevent caching of JavaScript files
    if response.headers.get('Content-Type') and 'javascript' in response.headers.get('Content-Type'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search_venue', methods=['POST'])
def search_venue():
    data = request.get_json()
    address = data.get('address')
    if not address:
        return jsonify({'error': 'Address is required'}), 400
    
    geolocator = Nominatim(user_agent="autocross_editor")
    try:
        location = geolocator.geocode(address)
        if location:
            return jsonify({
                'address': location.address,
                'latitude': location.latitude,
                'longitude': location.longitude
            })
        else:
            return jsonify({'error': 'Venue not found'}), 404
    except Exception as e:
        print(f"[ERROR] Geocoding failed: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5029)
