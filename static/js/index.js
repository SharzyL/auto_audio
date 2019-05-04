// TODO: 设置界面的样式需要改善
// TODO: 出错时需要一个对话框
// TODO: 兼容Edge
// TODO: 界面中文化


// 快速创建DOM对象并append到paren上
function createElement(tag, id, className, parent, type, attr_obj) {
    let ele = document.createElement(tag)
    if (id) {
        ele.id = id
    }
    if (className) {
        ele.className = className
    }
    if (type) {
        ele.type = type
    }
    if (parent) {
        parent.appendChild(ele)
    }
    if (attr_obj) {
        for (let attr in attr_obj) {
            ele.setAttribute(attr, attr_obj[attr])
        }
    }
    return ele
}

//将文字append到parent上
function appendText(text, parent) {
    let ele = document.createTextNode(text)
    parent.appendChild(ele)
}


window.onload = () => {
    //储存所有schedule的列表
    var scheduleList = []
    let playlist = document.getElementById('playlist')
    let player = document.getElementById('cplayer')
    let controlBtn = document.getElementById('control-btn')
    let songDirInput = document.getElementById('song-dir-input')
    let songVolumeInput = document.getElementsByClassName('cplayer-volume')[0]

    //从目录中截取音乐名(不含后缀)
    function getSongName(songDir) {
        return /[^/\\]+(?=.mp3$)/.exec(songDir)[0]
    }

    //根据传入的songLine对象播放对应的音乐
    function playSongLine(songLine) {
        player.audio.src = songLine.src
        player.play()
        player.currentLine = songLine //储存当前播放的songLine
        playingIcon.play(songLine)
    }


    //根据传入的session对象(或session名称)列表播放其中的音乐
    function playSession(session) {
        if (session.constructor == String) {
            session = document.getElementById('session-' + session)
        }
        let songLines = session.getElementsByClassName('song-line')
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

    //创建一个用于表示播放状态的图标，它会出现在正在播放的songLine的开头位置
    //当开始播放音乐时调用它的play方法，如果含songLine对象作为参数则会转移到这个songLine上
    //暂停时调用pause方法
    let playingIcon = createElement('i', 'playing-icon')
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


    //一个表示每日定时任务的类
    class ScheduleTask {
        constructor(hours, minutes, task) {
            //hours, minutes表示执行任务的时间，task为要执行的任务(无参函数)
            //当hours, minutes中有空值时，这个类不工作，但不报错，可以通过reset重设时间来使它开始工作
            this.hours = hours
            this.minutes = minutes
            this.task = task
            this.isWorking = false
            this.expectedTime = this._getExpectedTime()
        }

        //内部方法，用于获取下次执行的时间
        _getExpectedTime() {
            if (!this.hours || !this.minutes) {
                return undefined
            }
            let expectedTime = new Date
            expectedTime.setHours(this.hours)
            expectedTime.setMinutes(this.minutes)
            expectedTime.setSeconds(0)
            expectedTime.setMilliseconds(0)
            if (expectedTime < new Date) {
                expectedTime.setDate(expectedTime.getDate() + 1)
            }
            return expectedTime
        }

        //返回格式化的下次执行的时间，格式形如 HH:MM:SS
        formattedLeftTime() {
            if (!this.expectedTime) {
                return undefined
            }
            let time = this.expectedTime - (new Date)
            //辅助函数，用于执行带余除法，返回[商，余数]数组
            let intDivide = (a, b) => [Math.floor(a / b), a % b]
            let hours, minutes, seconds;
            [hours, time] = intDivide(time, 3600 * 1000);
            [minutes, time] = intDivide(time, 60 * 1000);
            [seconds, time] = intDivide(time, 1000);
            [hours, minutes, seconds] = [hours, minutes, seconds].map(String).map((str) => {
                if (str.length < 2) {
                    str = '0' + str
                } //将每个参数都转换为长为2的字符串
                return str
            })
            return hours + ':' + minutes + ':' + seconds
        }

        // 开始倒计时执行任务
        start() {
            if (!this.expectedTime) {
                this.isWorking = true
                return
            }
            this.countdown = this._getExpectedTime() - (new Date) //表示离下次执行所剩的时间
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

        //暂停执行任务
        cancel() {
            if (this.timeOutHandler) {
                clearTimeout(this.timeOutHandler)
            }
            if (this.intervalHandler) {
                clearInterval(this.intervalHandler)
            }
            this.isWorking = false
        }

        //切换准备执行/暂停执行状态
        toggle() {
            if (this.isWorking) {
                this.cancel()
            } else {
                this.start()
            }
        }

        //重新设定时间
        reset(hours, minutes) {
            this.hours = hours
            this.minutes = minutes
            this.expectedTime = this._getExpectedTime()
            if (this.isWorking) {
                this.cancel()
                this.start()
            }
        }
    }


    // 表示定时播放音乐的类，重写了父类的start, cancel方法
    class ScheduleMusicSession extends ScheduleTask {
        constructor(hours, minutes, session) {
            super(hours, minutes, () => {
                playSession(session)
            })
            this.sessionObj = document.getElementById('session-' + session)
            this.playTimeObj = this.sessionObj.getElementsByClassName('play-time')[0]
            this.leftTimeObj = this.sessionObj.getElementsByClassName('left-time')[0]
        }

        start() {
            super.start()
            this.leftTimeObj.style.visibility = 'visible'
            this.display()
            this.flushHandler = setInterval(() => this.display(), 1000)
        }

        //在LeftTimeObj上显示剩余时间
        display() {
            if (!this.expectedTime) {
                this.leftTimeObj.innerHTML = 'Unspecified playing time' //当类不工作时显示提示文字
            } else {
                this.leftTimeObj.innerHTML = this.formattedLeftTime() + ' later'
            }
        }

        cancel() {
            super.cancel()
            this.leftTimeObj.style.visibility = 'hidden'
            clearInterval(this.flushHandler)
        }
    }


    //header上的controlBtn用于控制所有schedule的开关
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


    // 根据传入的songs参数来创建歌曲列表
    //songs的格式形如{session name: [full song path]}
    // TODO: 在服务器提取metadata然后再songLine中分栏显示
    function renderPlaylist(songs) {
        for (let session in songs) {

            //创建DOM对象
            let sessionObj = createElement('div', 'session-' + session, 'session', playlist)
            let headObj = createElement('p', null, 'session-head', sessionObj)
            let sessionNameObj = createElement('span', null, 'session-name', headObj)
            sessionNameObj.innerHTML = session
            sessionNameObj.addEventListener('click', () => playSession(session)) //单击session文字时列表播放session


            let playTimeInput = createElement('div', null, 'play-time', headObj)
            appendText('Scheduled At ', playTimeInput)
            let hourInput = createElement('input', null, 'time-input', playTimeInput, 'text', {
                'maxlength': '2'
            })
            appendText(':', playTimeInput)
            let minuteInput = createElement('input', null, 'time-input', playTimeInput, 'text', {
                'maxlength': '2'
            })
            let leftTime = createElement('span', null, 'left-time', headObj)
            leftTime.style.visibility = 'hidden'

            // 如果localStorage中有缓存的话，则将缓存内容写入输入框
            let hours = localStorage.getItem(session + '-h')
            let minutes = localStorage.getItem(session + '-m')
            if (hours) {
                hourInput.value = hours
            }
            if (minutes) {
                minuteInput.value = minutes
            }

            let schedule = new ScheduleMusicSession(hours, minutes, session)
            scheduleList.push(schedule);
            [hourInput.legal, minuteInput.legal] = [true, true] //legal成员变量用于表示输入框中的内容是否合法(是否为范围内的整数)

            //当hourInput, minuteInput每次输入时判断输入是否合法，不合法时输入框变为红色
            hourInput.addEventListener('input', () => {
                if (/^\d*$/.test(hourInput.value) && hourInput.value <= 23) {
                    hourInput.style.backgroundColor = '#bfcff2'
                    hourInput.style.boxShadow = 'none'
                    hourInput.legal = true
                } else {
                    hourInput.style.backgroundColor = '#ffb3b3'
                    hourInput.style.boxShadow = 'inset 0px 0px 3px #ff3333'
                    hourInput.legal = false
                }
            })
            minuteInput.addEventListener('input', () => {
                if (/^\d*$/.test(minuteInput.value) && minuteInput.value <= 59) {
                    minuteInput.style.backgroundColor = '#bfcff2'
                    minuteInput.style.boxShadow = 'none'
                    minuteInput.legal = true
                } else {
                    minuteInput.style.backgroundColor = '#ffb3b3'
                    minuteInput.style.boxShadow = 'inset 0px 0px 3px #ff3333'
                    minuteInput.legal = false
                }
            })

            //当两个输入框的输入均为合法时，重设schedule对象，并将输入缓存进localStorage中
            //若有不合法的输入框，则将输入框重设为localStorage中缓存的值
            var submitTime = () => {
                if (hourInput.legal && minuteInput.legal) {
                    var hours = hourInput.value
                    var minutes = minuteInput.value
                    if (hours && minutes) {
                        localStorage.setItem(session + '-h', hours)
                        localStorage.setItem(session + '-m', minutes)
                    }
                    schedule.reset(hours, minutes)
                } else {
                    if (!hourInput.legal) {
                        hourInput.value = localStorage.getItem(session + '-h')
                    }
                    if (!minuteInput.legal) {
                        minuteInput.value = localStorage.getItem(session + '-m')
                    }
                }
            }
            hourInput.addEventListener('change', submitTime)
            minuteInput.addEventListener('change', submitTime)


            //生成该session内的播放列表
            let songBox = createElement('div', null, 'song-box', sessionObj)
            for (let songDir of songs[session]) {
                let songLine = createElement('p', null, 'song-line', songBox)
                songLine.innerHTML = getSongName(songDir)
                songLine.src = songDir
                songLine.addEventListener('click', () => {
                    if (songLine == player.currentLine) {
                        player.toggle()
                    } else {
                        playSongLine(songLine)
                    }
                })
            }
        }
    }



    //用于操作localStorage中储存的配置的对象
    //目前支持songDir(音乐目录) 和volume(默认音量)的存储
    //当读取setting中的值时，若localStorage中有存储则调用该存储，否则调用默认值
    let setting = {
        'defaultDir': '/songs',
        'defaultVolume': 50,

        get songDir() {
            if (localStorage.getItem('song-dir')) {
                return localStorage.getItem('song-dir')
            } else {
                localStorage.setItem('song-dir', this.defaultDir)
                return this.defaultDir
            }
        },

        //每次写入时向服务器验证是否为合法目录，非法时服务器返回400，此时讲输入框变红，并且不向localStorage中写入
        //合法时需要刷新页面以应用更新
        //TODO: 在非法时显示提示信息
        set songDir(dir) {
            let dirChange = new XMLHttpRequest
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

        //注意setting中获取的音量是以100作为最大值的
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


    //向服务器请求songinfo，然后调用renderPlayList渲染
    let songsRequest = new XMLHttpRequest
    songsRequest.open('get', '/songinfo')
    songsRequest.setRequestHeader('Content-Type', 'application/json;charset=utf-8')
    songsRequest.onreadystatechange = function () {
        if (songsRequest.readyState != XMLHttpRequest.DONE) {
            return
        }
        if (songsRequest.status != 200) {
            // console.log('Error ' + songsRequest.status + ': Failed to load song info')
            return
        }
        let response = JSON.parse(songsRequest.responseText)
        renderPlaylist(response)
    }
    songsRequest.send(null)
}