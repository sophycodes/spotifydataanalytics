from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS  # Import CORS
import pandas as pd
import numpy as np
from pathlib import Path
import os

app = Flask(__name__, static_folder='static')
CORS(app)  # Allow all origins


def clean_numeric(value):
    try:
        if pd.isna(value):
            return 0
        if isinstance(value, str):
            # Remove commas and any other non-numeric characters except decimal point
            cleaned = ''.join(c for c in value if c.isdigit() or c == '.')
            return float(cleaned) if cleaned else 0
        return float(value)
    except:
        return 0

def load_data():
    try:
        file_path = Path('code/data/Spotify_Songs_2024.csv')
        if not file_path.exists():
            print(f"Error: File not found at {file_path.absolute()}")
            return None
            
        # Read the CSV file
        df = pd.read_csv(file_path, encoding='latin1')  # Try latin1 encoding
        
        # Convert numeric columns
        numeric_columns = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach',
                         'YouTube Views', 'YouTube Likes', 'TikTok Views']
        
        for col in numeric_columns:
            if col in df.columns:
                df[col] = df[col].apply(clean_numeric)
        
        return df
        
    except Exception as e:
        print(f"Error loading data: {str(e)}")
        return None

# Global DataFrame
df = load_data()

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/tracks')
def get_tracks():
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Convert numeric columns to float and clean the data
        result_df = df.copy()
        numeric_cols = ['Spotify Streams', 'Spotify Playlist Count', 'Spotify Playlist Reach']
        for col in numeric_cols:
            if col in result_df.columns:
                result_df[col] = result_df[col].apply(clean_numeric)
        
        # Take only the first 100 rows for the visualization
        result = result_df.head(100).to_dict(orient='records')
        
        # Clean any NaN values
        for item in result:
            for key, value in item.items():
                if pd.isna(value):
                    item[key] = None
        
        return jsonify({
            'total': len(df),
            'data': result
        })
    except Exception as e:
        print(f"Error in get_tracks: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/top-artists')
def get_top_artists():
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        # Group by Artist and sum streams
        artist_stats = df.groupby('Artist').agg({
            'Spotify Streams': 'sum'
        }).reset_index()
        
        # Sort by streams and get top 10
        artist_stats = artist_stats.nlargest(10, 'Spotify Streams')
        
        # Convert to list of dictionaries
        result = []
        for _, row in artist_stats.iterrows():
            result.append({
                'Artist': row['Artist'],
                'Spotify Streams': float(row['Spotify Streams'])  # Ensure it's a float
            })
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_top_artists: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/platform-comparison')
def get_platform_comparison():
    if df is None:
        return jsonify({'error': 'Data not loaded'}), 500
    
    try:
        platforms = {
            'Spotify': 'Spotify Streams',
            'YouTube': 'YouTube Views',
            'TikTok': 'TikTok Views'
        }
        
        stats = {}
        for platform, column in platforms.items():
            if column in df.columns:
                total = float(df[column].sum())  # Convert to float
                stats[platform] = {
                    'total': total,
                    'average': float(df[column].mean()),
                    'median': float(df[column].median())
                }
        
        return jsonify(stats)
    except Exception as e:
        print(f"Error in platform_comparison: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/debug/data-info')
def get_data_info():
    """Endpoint for debugging data loading issues"""
    if df is None:
        return jsonify({
            'status': 'error',
            'message': 'Data not loaded',
            'file_exists': Path('data/Spotify_Songs_2024.csv').exists(),
            'working_directory': os.getcwd(),
            'data_directory_contents': os.listdir('data') if os.path.exists('data') else []
        })
    
    # Return sample of data for debugging
    sample_data = df.head(3).to_dict(orient='records')
    
    # Clean the sample data
    for item in sample_data:
        for key, value in item.items():
            if pd.isna(value):
                item[key] = None
            elif isinstance(value, np.int64):
                item[key] = int(value)
            elif isinstance(value, np.float64):
                item[key] = float(value)
    
    return jsonify({
        'status': 'success',
        'shape': df.shape,
        'columns': df.columns.tolist(),
        'sample_data': sample_data
    })

if __name__ == '__main__':
    if df is None:
        print("\nWARNING: Failed to load data!")
        print("Please check:")
        print("1. Data file exists in 'data' directory")
        print("2. File has correct name: 'Spotify_Songs_2024.csv'")
        print("3. File is readable")
    else:
        print("\nServer ready!")
        print(f"Loaded {len(df)} records with {len(df.columns)} columns")
        print("\nAvailable columns:", df.columns.tolist())
    
    app.run(port=8000, debug=True)