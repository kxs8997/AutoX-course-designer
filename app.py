from flask import Flask, render_template, request, jsonify
from geopy.geocoders import Nominatim

app = Flask(__name__)

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
    app.run(debug=True, port=5001)
