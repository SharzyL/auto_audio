// 一个模仿Chrome内置Audio control控件的音乐播放器
//使用方法: 在html中包含 <div class="cplayer"></div>, 然后引用/static/js/cplayer.js  /static/css/cplayer.css 文件
//包含的方法: 
//  play(src)     -- 播放src所指定的资源，src为空时播放cplayer.audio.src中的资源
//  pause()       -- 暂停
//  load(src)     -- 加载src所指定的资源以备播放
//  toggle()      -- 切换播放/暂停
//  toggleMuted() -- 切换静音/不静音

//可以set和get的成员变量：
//  volume        -- 音量(0到1之间的实数)
//  currentTime   -- 播放进度(以秒为单位)
// 其它audio对象所给出的方法可以通过cplayer.audio.<func>调用

// TODO: 音量控件改为动态的

(function () {
    function init_cplayer(cplayer) {
        cplayer.innerHTML = ''
        cplayer.audio = document.createElement('audio')
        cplayer.audio.className = 'cplayer-audio'
    
        cplayer.playBtn = document.createElement('button')
        cplayer.playBtn.className = 'cplayer-play fa fa-play'
    
        cplayer.time = document.createElement('span')
        cplayer.time.className = 'cplayer-time'
        cplayer.time.innerHTML = '0:00 / 0:00'
    
        cplayer.prog = document.createElement('input')
        cplayer.prog.type = 'range'
        cplayer.prog.value = 0
        cplayer.prog.className = 'cplayer-prog'
    
        cplayer.sound = document.createElement('button')
        cplayer.sound.className = 'cplayer-sound fa fa-volume-up'
    
        cplayer.muteLine = document.createElement('span')
        cplayer.muteLine.className = 'cplayer-mute'
        cplayer.sound.appendChild(cplayer.muteLine)
    
        cplayer.vol = document.createElement('input')
        cplayer.vol.type = 'range'
        cplayer.vol.className = 'cplayer-volume'
    
        ;[cplayer.audio, cplayer.playBtn, cplayer.time, cplayer.prog, cplayer.sound, cplayer.vol
        ].forEach((widget) => cplayer.appendChild(widget))

        Object.defineProperty(cplayer, 'volume', {
            get : () => cplayer.audio.volume,
            set : (value) => {
                cplayer.audio.value = value
                cplayer.vol.value = value
            }
        })
    
        Object.defineProperty(cplayer, 'currentTime', {
            get : () => cplayer.audio.currentTime,
            set : (value) => {
                cplayer.audio.currentTime = value
                cplayer.prog.value = value * 100
            }
        })

        cplayer.audio.addEventListener('loadeddata', () => {
            cplayer._update()
        })
    
        cplayer.playBtn.addEventListener('click', () => {
            cplayer.toggle()
        })
    
        cplayer.sound.addEventListener('click', () => {
            cplayer.toggleMuted()
        })
    
        cplayer.prog.addEventListener('input', () => {
            cplayer._isSeeking = true
            cplayer._flushByProg()
        })
    
        cplayer.prog.addEventListener('change', () => {
            cplayer._isSeeking = false
            cplayer.audio.currentTime = cplayer.prog.value
            cplayer._update()
        })
    
        cplayer.vol.addEventListener('input', () => {
            var volume = cplayer.vol.value / 100
            cplayer.audio.volume = volume
            if (volume == 0) {
                cplayer.sound.className = 'cplayer-sound fa fa-volume-off'
            } else if (volume < 0.5) {
                cplayer.sound.className = 'cplayer-sound fa fa-volume-down'
            } else {
                cplayer.sound.className = 'cplayer-sound fa fa-volume-up'
            }
        })
        cplayer.addEventListener = cplayer.audio.addEventListener.bind(cplayer.audio)
    
        cplayer.play = (src) => {
            if (src) {
                cplayer.audio.src = src
            }
            cplayer.audio.play()
            cplayer.playBtn.className = 'cplayer-play fa fa-pause'
            cplayer._update()
            cplayer.flushHandler = setInterval(() => cplayer._update(), 1000)
        }
    
        cplayer.pause = () => {
            cplayer.audio.pause()
            cplayer.playBtn.className = 'cplayer-play fa fa-play'
            clearInterval(cplayer.flushHandler)
        }
    
        cplayer.load = (src) => {
            if (src) {
                cplayer.audio.src = src
            }
            cplayer.audio.load()
            cplayer._update()
        }
    
        cplayer.toggle = () => {
            if (cplayer.audio.paused) {
                cplayer.play()
            } else {
                cplayer.pause()
            }
        }
    
        cplayer.toggleMuted = () => {
            if (cplayer.audio.muted) {
                cplayer.audio.muted = false
                cplayer.muteLine.style.display = 'none'
            } else {
                cplayer.audio.muted = true
                cplayer.muteLine.style.display = 'block'
            }
        }
    
        //输入一个正整数表示秒数，输出一个形如MM:SS的字符串
        var _formatTime = (seconds) => {
            var intDiv = (a, b) => [Math.floor(a / b), a % b]
            var minutes;
            [minutes, seconds] = intDiv(seconds, 60).map(String)
            if (seconds.length < 2) {
                seconds = '0' + seconds
            }
            return minutes + ':' + seconds
        }
    
        //当拖动进度条是调用，用来更新cplayer.time的显示数值
        cplayer._flushByProg = () => {
            var played = cplayer.prog.value
            var total = Math.floor(cplayer.audio.duration)
            cplayer.time.innerHTML = _formatTime(played) + ' / ' + _formatTime(total)
        }
    
        //播放音乐时调用，修改cplayer.time的数值以及改变进度条的位置
        cplayer._update = () => {
            var played = Math.floor(cplayer.audio.currentTime)
            var total = Math.floor(cplayer.audio.duration)
            if (!total) {
                total = 0
            }
            cplayer.prog.max = Math.floor(total)
            if (!cplayer._isSeeking) {
                cplayer.prog.value = played
            }
            cplayer.time.innerHTML = _formatTime(played) + ' / ' + _formatTime(total)
        }
    }
    
    function initAllCplayer() {
        for (var player of document.getElementsByClassName('cplayer')) {
            init_cplayer(player)
        }
    }
    
    
    window.addEventListener('load', () => initAllCplayer())
})()