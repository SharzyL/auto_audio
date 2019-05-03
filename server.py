from flask import Flask, send_file, abort, request
import json
import os
from os.path import join
import configparser

default_song_dir = 'songs/'
app = Flask(__name__)
config = configparser.ConfigParser()
config.read('setting.ini')
setting = config['app'] # setting is a dict to record all config


def write_config():
    with open('setting.ini', 'w') as cfg:
        config.write(cfg)


def filter_dir(_dir):
    return _dir[1:] if _dir.startswith('/') or _dir.startswith('\\') else _dir


@app.route('/app')
def index():
    return app.send_static_file('html/index.html')


@app.route('/songinfo')
def songs():
    def scan_music(path):
        MUSIC_EXT = ['.mp3', '.wav', '.flac', '.wma', '.aac']
        return [join(path, song) for song in os.listdir(path)
                if os.path.splitext(song)[1].lower() in MUSIC_EXT]

    def get_songs(_dir):
        _dir = filter_dir(_dir)
        return {session: scan_music(join(_dir, session)) for session in os.listdir(_dir)
                if os.path.isdir(join(_dir, session))}

    try:
        song_dir = request.args['dir']
    except KeyError:
        song_dir = setting['song dir']

    try:
        print(get_songs(song_dir))
        return json.dumps(get_songs(song_dir), ensure_ascii=False)
    except FileNotFoundError:
        return f'Error 400: Directory "{song_dir}" does not exist', 400


@app.route('/test')
def test():
    return send_file('C:\\_dev\\py\\auto_backup\\src\\perm.png')


@app.route('/songs/<session>/<song>')
def get_song(session, song):
    path = join(default_song_dir, session, song)
    if '..' in path:
        abort(404)
    return send_file(path, as_attachment=True, conditional=True)


@app.route('/setting')
def edit_setting():
    song_dir = filter_dir(request.args['songDir'])
    if os.path.isdir(song_dir):
        setting['song dir'] = song_dir
        write_config()
        return song_dir
    else:
        return f'Error 400: Directory "{song_dir}" not exist', 400

@app.route('/setting/update')
def update_setting():
    config.read('setting.ini')
    setting = config
    print(setting)
    return 'Update succeeded'
