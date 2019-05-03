/* eslint-disable no-console */

const defaultTime = {
    'morning': {
        'hours': 7,
        'minutes': 40
    },
    'noon': {
        'hours': 14,
        'minutes': 20
    }
}

window.onload = () => {
    var playlist = document.getElementById('playlist')
    var player = document.getElementById('cplayer')
    var controlBtn = document.getElementById('control-btn')
    var songDirInput = document.getElementById('song-dir-input')
    var songVolumeInput = document.getElementsByClassName('cplayer-volume')[0]

    function getSongName(songDir) {
        return /[^/\\]+(?=.mp3$)/.exec(songDir)[0]
    }


    function playSongLine(songLine) {
        player.audio.src = songLine.id
        player.play()
        player.currentLine = songLine
        playingIcon.play(songLine)
    }


    function playSession(session) {
        if (session.constructor == String) {
            session = document.getElementById('session-' + session)
        }
        var songLines = session.getElementsByClassName('song-line')
        playSongLine(songLines[0])
        let count = 1 // record number of played songs
        let num = songLines.length
        player.addEventListener('ended', () => {
            if (count < num) {
                playSongLine(songLines[count])
                count++
            }
        })
    }


    var playingIcon = document.createElement('i')
    playingIcon.id = 'playing-icon'
    player.addEventListener('pause', () => playingIcon.pause())
    player.addEventListener('play', () => playingIcon.play())
    playingIcon.play = (songLine) => {
        playingIcon.className = 'fa fa-play'
        if (songLine) {
            songLine.appendChild(playingIcon)
        }
    }
    playingIcon.pause = () => {
        playingIcon.className = 'fa fa-pause'
    }
    playingIcon.hide = () => {
        playingIcon.style.display = 'none'
    }


    // fill playlist
    function renderPlaylist(songs) {
        for (let session in songs) {
            var sessionObj = document.createElement('div')
            sessionObj.className = 'session'
            sessionObj.id = 'session-' + session
            playlist.appendChild(sessionObj)

            var headObj = document.createElement('p')
            headObj.className = 'session-head'
            sessionObj.appendChild(headObj)

            var sessionNameObj = document.createElement('span')
            sessionNameObj.innerHTML = session
            sessionNameObj.className = 'session-name'
            sessionNameObj.addEventListener('click', () => playSession(session))
            headObj.appendChild(sessionNameObj)

            var leftTime = document.createElement('span')
            leftTime.className = 'left-time'
            leftTime.style.display = 'none'
            headObj.appendChild(leftTime)

            var songBox = document.createElement('div')
            songBox.className = 'song-box'
            sessionObj.appendChild(songBox)

            for (let songDir of songs[session]) {
                let songLine = document.createElement('p')
                songLine.innerHTML = getSongName(songDir)
                songLine.className = 'song-line'
                songLine.id = songDir
                songLine.addEventListener('click', () => {
                    if (songLine == player.currentLine) {
                        player.toggle()
                    } else {
                        playSongLine(songLine)
                    }
                })
                songBox.appendChild(songLine)
            }
        }
    }

    var scheduleList
    controlBtn.addEventListener('click', () => {
        scheduleList.forEach((task) => task.toggle())
        if (scheduleList.isWorking) {
            controlBtn.innerHTML = '<i class="fa fa-play"></i> Start Auto Play'
            controlBtn.className = 'btn-start'
        } else {
            controlBtn.innerHTML = '<i class="fa fa-stop"></i> Stop Auto Play'
            controlBtn.className = 'btn-stop'
        }
        scheduleList.isWorking = !scheduleList.isWorking
    })


    class ScheduleTask {
        constructor(hours, minutes, task) {
            this.hours = hours
            this.minutes = minutes
            this.task = task
            this.isWorking = false
            this.expectedTime = this.getExpectedTime()
        }

        getExpectedTime() {
            var expectedTime = new Date
            expectedTime.setHours(this.hours)
            expectedTime.setMinutes(this.minutes)
            expectedTime.setSeconds(0)
            expectedTime.setMilliseconds(0)
            if (expectedTime < new Date) {
                expectedTime.setDate(expectedTime.getDate() + 1)
            }
            return expectedTime
        }

        formattedLeftTime() { // return formatted string of the time until next execution
            var time = this.expectedTime - (new Date)
            var intDivide = (a, b) => [Math.floor(a / b), a % b]
            var hours, minutes, seconds;
            [hours, time] = intDivide(time, 3600 * 1000);
            [minutes, time] = intDivide(time, 60 * 1000);
            [seconds, time] = intDivide(time, 1000);
            [hours, minutes, seconds] = [hours, minutes, seconds].map(String).map((str) => {
                if (str.length < 2) {
                    str = '0' + str
                }
                return str
            })
            return hours + ':' + minutes + ':' + seconds
        }

        start() {
            this.countdown = this.getExpectedTime() - (new Date)
            this.timeOutHandler = setTimeout(() => {
                this.task()
                this.expectedTime.setDate(this.expectedTime.getDate() + 1)
                this.intervalHandler = setInterval(
                    () => {
                        this.task()
                        this.expectedTime.setDate(this.expectedTime.getDate() + 1)
                    },
                    24 * 3600 * 1000)
            }, this.countdown)
            this.isWorking = true
        }

        cancel() {
            if (this.timeOutHandler) {
                clearTimeout(this.timeOutHandler)
            }
            if (this.intervalHandler) {
                clearInterval(this.intervalHandler)
            }
            this.isWorking = false
        }

        toggle() {
            if (this.isWorking) {
                this.cancel()
            } else {
                this.start()
            }
        }
    }


    class ScheduleMusicSession extends ScheduleTask {
        constructor(hours, minutes, session) {
            super(hours, minutes, () => {
                playSession(session)
            })
            this.sessionObj = document.getElementById('session-' + session)
            this.leftTimeObj = this.sessionObj.getElementsByClassName('left-time')[0]
        }

        start() {
            super.start()
            this.leftTimeObj.style.display = 'inline'
            this.display()
            this.flushHandler = setInterval(() => this.display(), 1000)
        }

        display() {
            this.leftTimeObj.innerHTML = this.formattedLeftTime() + ' later'
        }

        cancel() {
            super.cancel()
            this.leftTimeObj.style.display = 'none'
            clearInterval(this.flushHandler)
        }
    }


    var setting = {
        'defaultDir': '/songs',
        'defaultTime': {
            'morning': {
                'hours': 7,
                'minutes': 40
            },
            'noon': {
                'hours': 14,
                'minutes': 20
            }
        },
        'defaultVolume': 50,

        get songDir() {
            if (localStorage.getItem('song-dir')) {
                return localStorage.getItem('song-dir')
            } else {
                localStorage.setItem('song-dir', this.defaultDir)
                return this.defaultDir
            }
        },

        set songDir(dir) {
            var dirChange = new XMLHttpRequest
            dirChange.open('get', '/setting?songDir=' + encodeURI(dir))
            dirChange.onreadystatechange = () => {
                if (dirChange.readyState == XMLHttpRequest.DONE) {
                    if (dirChange.status == 200) {
                        localStorage.setItem('song-dir', dir)
                        // window.location.reload()
                        songDirInput.style.backgroundColor = 'white'
                        songDirInput.style.boxShadow = 'none'
                    } else {
                        songDirInput.style.backgroundColor = '#ffb3b3'
                        songDirInput.style.boxShadow = 'inset 0px 0px 3px #ff3333'
                    }
                }
            }
            dirChange.send(null)
        },

        get volume() {
            if (localStorage.getItem('volume')) {
                return localStorage.getItem('volume')
            } else {
                localStorage.setItem('volume', this.defaultDir)
                return this.defaultVolume
            }
        },

        set volume(num) {
            localStorage.setItem('volume', num)
        }
    }
    songDirInput.value = setting.songDir
    songDirInput.addEventListener('input', () => {
        setting.songDir = songDirInput.value
    })
    songVolumeInput.value = setting.volume
    player.audio.volume = setting.volume / 100
    songVolumeInput.addEventListener('change', () => {
        setting.volume = songVolumeInput.value
    })


    var songsRequest = new XMLHttpRequest
    songsRequest.open('get', '/songinfo')
    songsRequest.setRequestHeader('Content-Type', 'application/json;charset=utf-8')
    songsRequest.onreadystatechange = function () {
        if (songsRequest.readyState != XMLHttpRequest.DONE) {
            return
        }
        if (songsRequest.status != 200) {
            console.log('Error ' + songsRequest.status + ': Failed to load song info')
            return
        }
        var response = JSON.parse(songsRequest.responseText)
        renderPlaylist(response)
        scheduleList = [
            new ScheduleMusicSession(7, 30, 'morning'),
            new ScheduleMusicSession(20, 4, 'noon')
        ]
    }
    songsRequest.send(null)
}