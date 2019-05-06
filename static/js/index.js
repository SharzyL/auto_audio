/* eslint-disable no-console */
// TODO: 兼容Edge
// TODO: 界面中文化


// 快速创建DOM对象并append到paren上
function createElement(tag, id, className, parent, title, type, attr_obj) {
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
    if (title) {
        ele.title = title
    }
    if (attr_obj) {
        for (let attr in attr_obj) {
            ele.setAttribute(attr, attr_obj[attr])
        }
    }
    return ele
}

//从目录中截取音乐名(不含后缀)
function getSongName(songDir) {
    return /[^/\\]+(?=.mp3$)/.exec(songDir)[0]
}

//简写两个常用方法
var byId = id => document.getElementById(id)
var byClass = className => document.getElementsByClassName(className)[0]


//弹出报错窗口
function errorDialog(title, text, buttonText, callBack) {
    var dialogShadow = byId('dialog-shadow')
    var dialogWrap = byId('error-dialog-wrap')
    // var dialogObj = byId('error-dialog')
    var titleObj = byId('error-title')
    var textObj = byId('error-text')
    var confirmBtn = byId('error-confirm')
    titleObj.innerHTML = title
    textObj.innerHTML = text
    buttonText.innerHTML = buttonText
    dialogShadow.style.display = 'block'
    dialogWrap.style.display = 'flex'
    confirmBtn.addEventListener('click', () => {
        dialogShadow.style.display = 'none'
        dialogWrap.style.display = 'none'
        callBack()
    })
}

//一个表示在localStorage中存储的类
//通过调用get(), set(value)方法来存取
class StoredValue {
    constructor(defaultValue, name) {
        this.default = defaultValue
        this.name = name
    }

    get() {
        if (localStorage.getItem(this.name)) {
            return localStorage.getItem(this.name)
        } else {
            localStorage.setItem(name, this.default)
            return this.default
        }
    }

    set(value) {
        localStorage.setItem(this.name, value)
    }
}


window.onload = () => {
    //定义全局变量
    var scheduleList = []
    scheduleList.isWorking = false
    var playlist = byId('playlist')
    var player = byId('cplayer')
    player.currentLine = null
    player.index = 0
    player.currentSession = null
    var controlBtn = byId('control-btn')
    var settingDialog = byId('setting-dialog')
    initSetting()

    //根据传入的songLine对象播放对应的音乐
    function playSongLine(songLine) {
        player.audio.src = songLine.src
        player.play()
        player.currentLine = songLine //储存当前播放的songLine
        player.index = songLine.index //储存当前播放的song在session中的指标
        playingIcon.play(songLine)
    }

    //通过监听播放器的end事件控制播放方式
    player.addEventListener('ended', () => {
        let session = player.currentLine.parentElement.parentElement
        if (session.mode.get() == 'single') {
            playSongLine(player.currentLine)
            return
        }
        let songLines = player.currentLine.parentElement.children
        let num = songLines.length
        
        function shufflePlay() {
            if (num == 1) {
                playSongLine(songLines[0])
            }
            //反复循环生成随机数直至rand() != index ,防止shuffle时连续两次播放到同一首音乐
            var r
            while((r = Math.floor(num * Math.random() * (1 - 1e-15))) == player.index){continue}
            playSongLine(songLines[r])
        }
        if ((session.mode.get() == 'list' && player.index == num - 1)) {
            //列表播放到结尾，或一首音乐放完后超出了最大时间后时播放停止
            player.currentSession = null
        } else {
            if (session.mode.get() == 'shuffle') {
                shufflePlay()
            } else {
                playSongLine(songLines[(player.index + 1) % num])
            }
        }
    })


    //根据传入的session对象(或session名称)列表播放其中的音乐
    //playMode: single(单曲循环), list(列表), circular(循环), shuffle(随机)
    //maxTime: 最大播放时间(/ min)，当playMode不为list时，该参数必须指定才能确保播放会结束
    function playSession(session) {
        if (session.constructor == String) {
            session = byId('session-' + session)
        }
        let songLines = session.getElementsByClassName('song-line')
        let startTime = new Date
        player.currentSession = session

        //session为空时直接退出，防止出错
        if (!songLines) {
            return
        }

        if (session.mode.get() == 'shuffle') {
            playSongLine(songLines[Math.floor(songLines.length * Math.random() * (1 - 1e-15))])
        } else {
            playSongLine(songLines[0])
        }

        if (session.mode.max.get()) {
            //使用onended为了确保这个事件在addEventListener之前发生
            player.audio.onended = () => {
                if ((new Date - startTime > session.max.get() * 60000)) {
                    player.pause()
                    player.onended = null
                }
            }
        }
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
    // 注意：构造函数必须在LeftTime被构造之后调用
    class ScheduleMusicSession extends ScheduleTask {
        constructor(hours, minutes, session) {
            if (session.constructor == String) {
                session = byId('session' + session)
            }
            super(hours, minutes, () => {
                playSession(session, this.playMode, this.maxTime)
            })
            this.sessionObj = session
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

    function initSetting() {
        var validate = (inputObj, validater) => {
            // 一个辅助函数，将一个input类型的DOM对象加上验证功能，其中validater是一个返回bool值的函数
            // 每当input对象更新时调用validater进行检查，若返回false则添加类名'input-invalid'
            // input对象会被赋给一个legal成员变量，用于记录值是否有效
            inputObj.legal = true
            inputObj.addEventListener('input', () => {
                if (validater(inputObj.value)) {
                    inputObj.classList.remove('input-invalid')
                    inputObj.legal = true
                } else {
                    inputObj.classList.add('input-invalid')
                    inputObj.legal = false
                }
            })
        }
        var inputObjs = [byId('hours-input'), byId('minutes-input'), byId('max-input')]
        var hoursInput, minutesInput, maxInput
        ;[hoursInput, minutesInput, maxInput] = inputObjs
        validate(hoursInput, str => /^\d+$/.test(str) && str < 24) //小于24的正整数
        validate(minutesInput, str => /^\d+$/.test(str) && str < 60) //小于60的正整数
        validate(maxInput, str => /^\d+$/.test(str) || (!str && getCurrentMode() == 'list'))
        //要么是正整数，要么不填并且播放模式为列表播放

        var modeIcons = document.getElementsByClassName('play-mode')
        //辅助函数，从一个mode-icon对象中提取所对应的mode的名字
        var getModeName = (modeIcon) => modeIcon.id.slice(10)
        //辅助函数，获取当前界面上选取的playmode
        var getCurrentMode = () => getModeName(byClass('play-mode-selected'))
        for (let modeIcon of modeIcons) {
            modeIcon.addEventListener('click', () => {
                //点击mode-icon时更改其样式
                byId('play-mode-' + getCurrentMode()).classList.remove('play-mode-selected')
                modeIcon.classList.add('play-mode-selected')
                //检查maxInput是否为空
                if (!maxInput.value) {
                    if (getModeName(modeIcon) == 'list') {
                        maxInput.classList.remove('input-invalid')
                        maxInput.legal = true
                    } else {
                        maxInput.classList.add('input-invalid')
                        maxInput.legal = false
                    }
                }
                //控制confirm按钮
                if (hoursInput.legal && minutesInput.legal && maxInput.legal) {
                    confirmBtn.classList.remove('button-wb-disabled')
                    settingMsg.style.visibility = 'hidden'
                } else {
                    confirmBtn.classList.add('button-wb-disabled')
                    settingMsg.style.visibility = 'visible'
                }
            })
        }

        //每次设置项有更改时，检验是否所有输入项均合法，从而更改confirm按钮的开/关以及提示文字的显示
        let settingMsg = byClass('setting-msg')
        let confirmBtn = byId('setting-confirm')
        inputObjs.forEach((obj) => {
            obj.addEventListener('input', () => {
                if (hoursInput.legal && minutesInput.legal && maxInput.legal) {
                    confirmBtn.classList.remove('button-wb-disabled')
                    settingMsg.style.visibility = 'hidden'
                } else {
                    confirmBtn.classList.add('button-wb-disabled')
                    settingMsg.style.visibility = 'visible'
                }
            })
        })

        var closeDialog = () => {
            byId('dialog-shadow').style.display = 'none'
            byId('setting-dialog-wrap').style.display = 'none'
            //清除选中的play-mode，避免下次打开setting-dialog时发生重复
            byClass('play-mode-selected').classList.remove('play-mode-selected')
        }

        //当点击confirm时，提交在设置界面的修改，并隐藏设置界面
        byId('setting-confirm').addEventListener('click', () => {
            settingDialog.sessionObj.hours.set(hoursInput.value)
            settingDialog.sessionObj.minutes.set(minutesInput.value)
            settingDialog.sessionObj.max.set(maxInput.value)
            settingDialog.sessionObj.mode.set(getModeName(byClass('play-mode-selected')))
            settingDialog.sessionObj.schedule.reset(
                hoursInput.value, 
                minutesInput.value, 
                getModeName(byClass('play-mode-selected')), 
                maxInput.value
            )
            closeDialog()
        })

        //点击cancel时，隐藏设置界面，不进行其它操作
        byId('setting-cancel').addEventListener('click', () => {
            closeDialog()
        })
    }


    //header上的controlBtn用于控制所有schedule的开和关
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
            sessionNameObj.addEventListener('click', () => {
                playSession(sessionObj)
            }) //单击session文字时列表播放session
            let settingIcon = createElement('i', null, 'setting-icon fa fa-gear', headObj, 'Playing Settings')
            let leftTime = createElement('span', null, 'left-time', headObj)
            leftTime.style.visibility = 'hidden'


            //为每个session创建若干个StoredValue对象并把它们attach到sessionObj上
            sessionObj.hours = new StoredValue('0', session + '-h')
            sessionObj.minutes = new StoredValue('0', session + '-m')
            sessionObj.max = new StoredValue('', session + '-max')
            sessionObj.mode = new StoredValue('list', session + '-mode')
            let schedule = new ScheduleMusicSession(
                sessionObj.hours.get(),
                sessionObj.minutes.get(),
                sessionObj,
                sessionObj.mode.get(),
                sessionObj.mode.get()
            )
            scheduleList.push(schedule)
            sessionObj.schedule = schedule
            settingIcon.addEventListener('click', () => {
                settingDialog.sessionObj = sessionObj
                byId('dialog-shadow').style.display = 'block'
                byId('setting-dialog-wrap').style.display = 'flex'
                byId('hours-input').value = sessionObj.hours.get()
                byId('minutes-input').value = sessionObj.minutes.get()
                byId('max-input').value = sessionObj.max.get()
                byId('play-mode-' + sessionObj.mode.get()).classList.add('play-mode-selected')
            })

            //生成该session内的播放列表
            let songBox = createElement('div', null, 'song-box', sessionObj)
            let sessionSongs = songs[session]
            for (let i = 0; i < sessionSongs.length; i ++) {
                songDir = sessionSongs[i]
                let songLine = createElement('p', null, 'song-line', songBox)
                songLine.innerHTML = getSongName(songDir)
                songLine.src = songDir
                songLine.index = i //记录songline在songbox中的位置，方便列表播放
                songLine.addEventListener('click', () => {
                    if (songLine == player.currentLine) {
                        player.toggle()
                    } else {
                        playSongLine(songLine)
                    }
                    if (session != player.currentSession) {
                        //如果手动播放不再当前session内的音乐，则取消session play状态
                        player.currentSession = null
                        player.onended = null
                    }
                })
            }
        }
    }

    //控制song-dir-input的写入
    let songDirInput = byId('song-dir-input')
    let songDir = new StoredValue('/songs', 'song-dir')
    songDirInput.value = songDir.get()
    songDirInput.addEventListener('input', () => {
        //每次写入时向服务器发送请求，若返回状态值不为200，则将输入框标记无效
        let dir = songDirInput.value
        let dirChange = new XMLHttpRequest
        dirChange.open('get', '/setting?songDir=' + encodeURI(dir))
        dirChange.onreadystatechange = () => {
            if (dirChange.readyState == XMLHttpRequest.DONE) {
                if (dirChange.status == 200) {
                    songDir.set(dir)
                    songDirInput.classList.remove('input-invalid')
                } else {
                    songDirInput.classList.add('input-invalid')
                }
            }
        }
        dirChange.send(null)
    })


    //控制播放器音量的变化
    let songVolumeInput = byClass('cplayer-volume')
    let volume = new StoredValue('50', 'volume')
    songVolumeInput.value = volume.get()
    player.audio.volume = volume.get() / 100
    songVolumeInput.addEventListener('change', () => {
        volume.set(songVolumeInput.value)
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
            //服务器返回码不为200时弹出报错对话框，并要求刷新页面
            var errorMessage
            if (songsRequest.responseText) {
                errorMessage = 'Responce text:\n' + songsRequest.responseText
            } else {
                errorMessage = 'No responce from server'
            }
            errorDialog(
                'Failed to load song info',
                errorMessage,
                'Refresh',
                () => window.location.reload()
            )
            return
        }
        let response = JSON.parse(songsRequest.responseText)
        renderPlaylist(response)
    }
    songsRequest.send(null)
}