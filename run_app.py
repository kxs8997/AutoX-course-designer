from app import app
import webbrowser
import threading
import time
import os

def open_browser():
    """Open the web browser after giving the server a moment to start."""
    time.sleep(1.5)  # Wait a bit for the server to start
    webbrowser.open('http://127.0.0.1:5029')

if __name__ == '__main__':
    # Get the absolute path of the current script
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)  # Change the working directory to ensure resources are found
    
    # Start the browser in a separate thread
    threading.Thread(target=open_browser).start()
    
    # Run the Flask app
    app.run(host='127.0.0.1', port=5029, debug=False)
