from flask import Flask, send_file, abort, request
import json
import os
from os.path import join
import configparser

# TODO 服务器端渲染

app = Flask(__name__)

default_song_dir = 'songs/'
MUSIC_EXT = ['.mp3', '.wav', '.flac', '.wma', '.aac']  # 接受的音乐文件后缀
config = configparser.ConfigParser()
config.read('setting.ini')
setting = config['app']  # setting is a dict to record all config


def write_config():
    """
    向配置文件写入
    :return: None
    """
    with open('setting.ini', 'w') as cfg:
        config.write(cfg)


def filter_dir(_dir):
    """
    os.path 要求文件夹不以斜线开头，故需要去掉url请求里面的开头斜线
    :param _dir: 
    :return: None
    """
    return _dir[1:] if _dir.startswith('/') or _dir.startswith('\\') else _dir


@app.route('/app')
def application():
    """
    返回播放器界面
    :return: 
    """
    return app.send_static_file('html/index.html')


@app.route('/songinfo')
def songinfo():
    """
    返回目录中的歌曲信息，无参数时读取配置文件中指定的目录中的音乐信息
    当请求url中包含dir参数时返回该目录下的音乐信息
    返回格式为json，层级如下
    { 目录名 : [音乐文件名]}
    
    :return: json
    """
    def scan_music(path):
        """
        返回path目录下的所有音乐文件路径（包含path）
        :return: [str]
        """
        return [join(path, song) for song in os.listdir(path)
                if os.path.splitext(song)[1].lower() in MUSIC_EXT]  # 过滤文件后缀

    def get_songs(_dir):
        """
        返回将转化为包含音乐信息的dict，形式与待转化的json相同
        """
        _dir = filter_dir(_dir)
        return {session: scan_music(join(_dir, session)) for session in os.listdir(_dir)
                if os.path.isdir(join(_dir, session))}

    try:
        song_dir = request.args['dir']
    except KeyError:
        song_dir = setting['song dir']

    try:
        return json.dumps(get_songs(song_dir), ensure_ascii=False)
    except FileNotFoundError:
        return f'Error 400: Directory "{song_dir}" does not exist', 400


@app.route('/test')
def test():
    """
    仅用于功能测试，无作用
    """
    return 'test'


@app.route('/songs/<session>/<song>')
def get_song(session, song):
    """
    在配置中'song dir'配置项所制定的目录中的获取音乐文件（过滤含'..'的非法请求）
    """
    path = join(setting['song dir'], session, song)
    if '..' in path:
        abort(404)
    return send_file(path, as_attachment=True, conditional=True)


# TODO 修改为post方法
@app.route('/setting')
def edit_setting():
    """
    通过url进行设置
    url参数   作用
    songDir  修改'song dir'配置项
    
    :return: 配置成功的目录名
    """
    song_dir = filter_dir(request.args['songDir'])
    if os.path.isdir(song_dir):
        setting['song dir'] = song_dir
        write_config()
        return song_dir
    else:
        return f'Error 400: Directory "{song_dir}" not exist', 400


@app.route('/setting/update')
def update_setting():
    """
    重新读取配置文件
    """
    global setting
    config.read('setting.ini')
    setting = config
    print(setting)
    return 'Update succeeded'
