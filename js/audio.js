// Enhanced Audio System for Imposter Game

class AudioManager {
    constructor() {
        this.sounds = {};
        this.isMuted = false;
        this.initializeSounds();
    }

    initializeSounds() {
        // Create audio contexts for better control
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Load sounds
        this.sounds.reveal = this.createBeep(800, 0.1);
        this.sounds.click = this.createBeep(400, 0.05);
        this.sounds.success = this.createBeep(600, 0.2);
        this.sounds.error = this.createBeep(300, 0.2);
        this.sounds.timer = this.createBeep(400, 0.1);
        this.sounds.countdown = this.createBeep(200, 0.3);
    }

    createBeep(frequency, duration) {
        return () => {
            if (this.isMuted) return;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }
}

// Initialize audio manager
const audioManager = new AudioManager();

export function playSound(soundName) {
    audioManager.play(soundName);
}

export function toggleMute() {
    return audioManager.toggleMute();
}

window.playSound = playSound;
window.toggleMute = toggleMute;

// Sound effects for game events
export const playRevealSound = () => playSound('reveal');
export const playClickSound = () => playSound('click');
export const playSuccessSound = () => playSound('success');
export const playErrorSound = () => playSound('error');
export const playTimerSound = () => playSound('timer');
export const playCountdownSound = () => playSound('countdown');