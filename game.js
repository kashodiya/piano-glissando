const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 300,
    parent: 'game',
    scene: { create, update }
};

const game = new Phaser.Game(config);
let keys = [];
let audioContext;
let currentAnimation = null;
let selectedKeys = [];

function create() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const whiteKeyWidth = 40;
    const blackKeyWidth = 25;
    const whiteKeyHeight = 150;
    const blackKeyHeight = 100;
    
    let whiteKeyIndex = 0;
    
    for (let i = 0; i < 24; i++) {
        const noteInOctave = i % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
        
        if (!isBlack) {
            const key = this.add.rectangle(
                50 + whiteKeyIndex * whiteKeyWidth,
                150,
                whiteKeyWidth - 2,
                whiteKeyHeight,
                0xffffff
            ).setStrokeStyle(2, 0x000000).setInteractive();
            
            this.add.text(
                50 + whiteKeyIndex * whiteKeyWidth,
                210,
                i.toString(),
                { fontSize: '12px', color: '#000' }
            ).setOrigin(0.5);
            
            key.keyIndex = i;
            key.on('pointerdown', () => selectKey(i));
            keys[i] = key;
            whiteKeyIndex++;
        }
    }
    
    whiteKeyIndex = 0;
    for (let i = 0; i < 24; i++) {
        const noteInOctave = i % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
        
        if (isBlack) {
            const offset = noteInOctave === 1 ? 0 : noteInOctave === 3 ? 1 : noteInOctave === 6 ? 3 : noteInOctave === 8 ? 4 : 5;
            const key = this.add.rectangle(
                50 + (offset + Math.floor(i / 12) * 7) * whiteKeyWidth + whiteKeyWidth / 2,
                110,
                blackKeyWidth,
                blackKeyHeight,
                0x000000
            ).setInteractive();
            
            this.add.text(
                50 + (offset + Math.floor(i / 12) * 7) * whiteKeyWidth + whiteKeyWidth / 2,
                130,
                i.toString(),
                { fontSize: '10px', color: '#fff' }
            ).setOrigin(0.5);
            
            key.keyIndex = i;
            key.on('pointerdown', () => selectKey(i));
            keys[i] = key;
        }
    }
    
    document.getElementById('playBtn').onclick = playGlissando;
    document.getElementById('resetBtn').onclick = resetSelection;
    
    ['stay1', 'stay2', 'glissTime'].forEach(id => {
        document.getElementById(id).oninput = (e) => {
            document.getElementById(id + 'Val').textContent = e.target.value;
        };
    });
}

function update() {}

function selectKey(keyIndex) {
    if (selectedKeys.length < 2) {
        selectedKeys.push(keyIndex);
        updateKeyDisplay();
        highlightSelectedKeys();
    }
}

function resetSelection() {
    selectedKeys = [];
    updateKeyDisplay();
    highlightSelectedKeys();
}

function updateKeyDisplay() {
    document.getElementById('key1Display').textContent = selectedKeys[0] !== undefined ? selectedKeys[0] : 'None';
    document.getElementById('key2Display').textContent = selectedKeys[1] !== undefined ? selectedKeys[1] : 'None';
}

function highlightSelectedKeys() {
    keys.forEach((key, i) => {
        const noteInOctave = i % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
        
        if (i === selectedKeys[0]) {
            key.setFillStyle(0x4444ff);
        } else if (i === selectedKeys[1]) {
            key.setFillStyle(0xff4444);
        } else {
            key.setFillStyle(isBlack ? 0x000000 : 0xffffff);
        }
    });
}

function getFrequency(keyIndex) {
    return 440 * Math.pow(2, (keyIndex - 9) / 12);
}

function playGlissando() {
    if (selectedKeys.length < 2) {
        alert('Please select 2 keys by clicking on the piano');
        return;
    }
    if (currentAnimation) return;
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    console.log('Playing glissando from key', selectedKeys[0], 'to', selectedKeys[1]);
    
    const key1 = selectedKeys[0];
    const key2 = selectedKeys[1];
    const stay1 = parseInt(document.getElementById('stay1').value);
    const stay2 = parseInt(document.getElementById('stay2').value);
    const glissTime = parseInt(document.getElementById('glissTime').value);
    
    const startFreq = getFrequency(key1);
    const endFreq = getFrequency(key2);
    
    console.log('Frequencies:', startFreq, 'Hz to', endFreq, 'Hz');
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    
    oscillator.frequency.setValueAtTime(startFreq, now);
    gainNode.gain.setValueAtTime(0.3, now);
    
    oscillator.frequency.exponentialRampToValueAtTime(
        endFreq,
        now + stay1 / 1000 + glissTime / 1000
    );
    
    oscillator.frequency.setValueAtTime(
        endFreq,
        now + stay1 / 1000 + glissTime / 1000
    );
    
    gainNode.gain.setValueAtTime(
        0.3,
        now + stay1 / 1000 + glissTime / 1000 + stay2 / 1000
    );
    gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        now + stay1 / 1000 + glissTime / 1000 + stay2 / 1000 + 0.1
    );
    
    oscillator.start(now);
    oscillator.stop(now + stay1 / 1000 + glissTime / 1000 + stay2 / 1000 + 0.1);
    
    console.log('Audio started');
    
    animateGlissando(key1, key2, stay1, glissTime, stay2);
}

function animateGlissando(key1, key2, stay1, glissTime, stay2) {
    currentAnimation = { time: 0, key1, key2, stay1, glissTime, stay2 };
    
    const totalTime = stay1 + glissTime + stay2;
    const startTime = Date.now();
    
    function animate() {
        const elapsed = Date.now() - startTime;
        
        keys.forEach((key, i) => {
            const noteInOctave = i % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);
            
            if (i === selectedKeys[0]) {
                key.setFillStyle(0x4444ff);
            } else if (i === selectedKeys[1]) {
                key.setFillStyle(0xff4444);
            } else {
                key.setFillStyle(isBlack ? 0x000000 : 0xffffff);
            }
        });
        
        if (elapsed < stay1) {
            keys[key1].setFillStyle(0x00ff00);
        } else if (elapsed < stay1 + glissTime) {
            const progress = (elapsed - stay1) / glissTime;
            const currentKey = Math.round(key1 + (key2 - key1) * progress);
            keys[currentKey].setFillStyle(0xffff00);
        } else if (elapsed < totalTime) {
            keys[key2].setFillStyle(0x00ff00);
        } else {
            currentAnimation = null;
            highlightSelectedKeys();
            return;
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
}
