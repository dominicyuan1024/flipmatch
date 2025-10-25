/**
 * Web Audio交互声音管理器
 * 封装了网页交互声音的播放和控制功能
 */
class Sound {
    constructor() {
        this.audioContext = null;
        this.masterGainNode = null;
        this.sfxGainNode = null;
        this.isEnabled = true;
        this.soundPresets = {};
        
        this.init();
    }

    /**
     * 初始化音频系统
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createAudioNodes();
            this.createSoundPresets();
            console.log('Sound initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Sound:', error);
        }
    }

    /**
     * 创建音频节点
     */
    createAudioNodes() {
        // 主音量控制节点
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);
        this.masterGainNode.gain.value = 0.5;

        // 音效音量控制节点
        this.sfxGainNode = this.audioContext.createGain();
        this.sfxGainNode.connect(this.masterGainNode);
        this.sfxGainNode.gain.value = 0.7;
    }

    /**
     * 创建声音预设
     */
    createSoundPresets() {
        this.soundPresets = {
            click: {
                type: 'sine',
                frequency: 800,
                duration: 0.1,
                volume: 0.1
            },
            success: {
                type: 'sine',
                frequencies: [523.25, 659.25, 783.99],
                durations: [0.1, 0.1, 0.1],
                volume: 0.1
            },
            error: {
                type: 'sawtooth',
                frequencies: [200, 150],
                durations: [0.2, 0.2],
                volume: 0.1
            },
            hover: {
                type: 'sine',
                frequencies: [1000, 1200],
                durations: [0.05, 0.05],
                volume: 0.05
            },
            notification: {
                type: 'square',
                frequencies: [800, 600],
                durations: [0.1, 0.1],
                volume: 0.1
            },
            toggle: {
                type: 'sine',
                frequencies: [400, 600],
                durations: [0.05, 0.05],
                volume: 0.1
            },
            slider: {
                type: 'sine',
                frequency: 300,
                duration: 0.05,
                volume: 0.05,
                dynamic: true
            }
        };
    }

    /**
     * 播放指定类型的声音
     * @param {string} soundType - 声音类型
     * @param {number} value - 动态值（用于滑块等）
     */
    playSound(soundType, value = 0) {
        if (!this.isEnabled || !this.audioContext) return;

        const preset = this.soundPresets[soundType];
        if (!preset) {
            console.warn(`Sound preset '${soundType}' not found`);
            return;
        }

        // 确保音频上下文处于运行状态
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        if (preset.frequencies) {
            // 多频率声音（如成功音效）
            this.playMultiFrequencySound(preset);
        } else {
            // 单频率声音
            this.playSingleFrequencySound(preset, soundType, value);
        }
    }

    /**
     * 播放单频率声音
     */
    playSingleFrequencySound(preset, soundType, value) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = preset.type;
        
        // 处理动态频率（如滑块）
        if (preset.dynamic && soundType === 'slider') {
            oscillator.frequency.value = preset.frequency + (value * 5);
        } else {
            oscillator.frequency.value = preset.frequency;
        }

        gainNode.gain.value = preset.volume;

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + preset.duration);
    }

    /**
     * 播放多频率声音
     */
    playMultiFrequencySound(preset) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGainNode);

        oscillator.type = preset.type;

        let currentTime = this.audioContext.currentTime;
        
        // 设置多个频率点
        preset.frequencies.forEach((freq, index) => {
            oscillator.frequency.setValueAtTime(freq, currentTime);
            currentTime += preset.durations[index];
        });

        gainNode.gain.value = preset.volume;
        gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(currentTime);
    }

    /**
     * 设置主音量
     * @param {number} volume - 音量值 (0-1)
     */
    setMasterVolume(volume) {
        if (this.masterGainNode) {
            this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 设置音效音量
     * @param {number} volume - 音量值 (0-1)
     */
    setSfxVolume(volume) {
        if (this.sfxGainNode) {
            this.sfxGainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * 启用/禁用声音
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * 添加自定义声音预设
     * @param {string} name - 预设名称
     * @param {object} preset - 预设配置
     */
    addSoundPreset(name, preset) {
        this.soundPresets[name] = preset;
    }

    /**
     * 移除声音预设
     * @param {string} name - 预设名称
     */
    removeSoundPreset(name) {
        delete this.soundPresets[name];
    }

    /**
     * 获取所有可用的声音类型
     * @returns {string[]}
     */
    getAvailableSounds() {
        return Object.keys(this.soundPresets);
    }

    /**
     * 销毁实例，释放资源
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.masterGainNode = null;
        this.sfxGainNode = null;
        this.soundPresets = {};
    }
}

export default Sound

// 使用示例
/*
// 创建声音管理器实例
const sound = new Sound();

// 播放声音
sound.playSound('click');
sound.playSound('success');

// 控制音量
sound.setMasterVolume(0.8);
sound.setSfxVolume(0.6);

// 添加自定义声音
sound.addSoundPreset('custom', {
    type: 'triangle',
    frequency: 440,
    duration: 0.2,
    volume: 0.1
});

// 禁用声音
sound.setEnabled(false);
*/