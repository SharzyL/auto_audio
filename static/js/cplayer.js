/* eslint-disable no-console */
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

    cplayer.audio.addEventListener('loadeddata', () => {
        cplayer.update()
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
        cplayer.update()
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
        cplayer.update()
        cplayer.flushHandler = setInterval(() => cplayer.update(), 1000)
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
        cplayer.update()
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

    var _formatTime = (seconds) => {
        var intDiv = (a, b) => [Math.floor(a / b), a % b]
        var minutes;
        [minutes, seconds] = intDiv(seconds, 60).map(String)
        if (seconds.length < 2) {
            seconds = '0' + seconds
        }
        return minutes + ':' + seconds
    }

    cplayer._flushByProg = () => {
        var played = cplayer.prog.value
        var total = Math.floor(cplayer.audio.duration)
        cplayer.time.innerHTML = _formatTime(played) + ' / ' + _formatTime(total)
    }

    cplayer.update = () => {
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