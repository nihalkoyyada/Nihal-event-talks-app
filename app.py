import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION = 600  # 10 minutes

def parse_entry_content(content_html):
    if not content_html:
        return []
    soup = BeautifulSoup(content_html, 'html.parser')
    updates = []
    
    current_type = None
    current_elements = []
    
    for child in soup.contents:
        # Ignore empty whitespace strings
        if isinstance(child, str) and not child.strip():
            continue
            
        # Check if the element is a heading (like <h3>Change</h3>)
        if hasattr(child, 'name') and child.name in ['h3', 'h4']:
            # Save the previous block if exists
            if current_type and current_elements:
                html_str = "".join(str(e) for e in current_elements).strip()
                text_str = BeautifulSoup(html_str, 'html.parser').get_text(separator=' ').strip()
                updates.append({
                    "type": current_type,
                    "content_html": html_str,
                    "content_text": text_str
                })
                current_elements = []
            current_type = child.get_text().strip()
        else:
            if current_type is None:
                current_type = "Update"
            current_elements.append(child)
            
    # Add the last remaining block
    if current_type and current_elements:
        html_str = "".join(str(e) for e in current_elements).strip()
        text_str = BeautifulSoup(html_str, 'html.parser').get_text(separator=' ').strip()
        updates.append({
            "type": current_type,
            "content_html": html_str,
            "content_text": text_str
        })
        
    return updates

def fetch_and_parse_feed(force=False):
    now = time.time()
    if not force and cache["data"] and (now - cache["timestamp"] < CACHE_DURATION):
        return cache["data"], False

    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
        
        feed_title_node = root.find('atom:title', namespaces)
        feed_title = feed_title_node.text if feed_title_node is not None else "BigQuery Release Notes"
        
        entries = []
        for entry_node in root.findall('atom:entry', namespaces):
            title_node = entry_node.find('atom:title', namespaces)
            date_str = title_node.text if title_node is not None else "Unknown Date"
            
            id_node = entry_node.find('atom:id', namespaces)
            entry_id = id_node.text if id_node is not None else ""
            
            updated_node = entry_node.find('atom:updated', namespaces)
            updated_time = updated_node.text if updated_node is not None else ""
            
            link_node = entry_node.find("atom:link[@rel='alternate']", namespaces)
            link_url = link_node.attrib.get('href') if link_node is not None else ""
            
            content_node = entry_node.find('atom:content', namespaces)
            content_html = content_node.text if content_node is not None else ""
            
            # Parse individual updates from the HTML content
            updates = parse_entry_content(content_html)
            
            entries.append({
                "date": date_str,
                "id": entry_id,
                "updated": updated_time,
                "link": link_url,
                "updates": updates
            })
            
        result = {
            "title": feed_title,
            "last_fetched": time.strftime('%I:%M:%S %p, %b %d, %Y', time.localtime(now)),
            "entries": entries
        }
        
        cache["data"] = result
        cache["timestamp"] = now
        return result, True
    except Exception as e:
        # Fallback to cache if request fails
        if cache["data"]:
            return cache["data"], False
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force = request.args.get('force', 'false').lower() == 'true'
    try:
        data, fetched_new = fetch_and_parse_feed(force=force)
        return jsonify({
            "status": "success",
            "fetched_new": fetched_new,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    # Run server on port 5000
    app.run(debug=True, port=5000)
