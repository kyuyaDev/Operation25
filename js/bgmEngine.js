// Web Audio API 기반 절차적 배경음악 생성기 (Procedural BGM Engine)

export class BGMEngine {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.isPlaying = false;
    this.currentTheme = 'theme-space-night';
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerID = null;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // seconds
    this.bpm = 120;
  }

  // 미디 노트를 주파수로 변환 (A4 = 440Hz)
  mtof(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  playNote(note, time, duration, type, vol = 0.1) {
    if (!note) return;
    
    // 신디사이저 오실레이터 생성
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = this.mtof(note);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    // 소리 어택-릴리즈(A-R) 엔벨로프 설정
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.02); // 빠른 어택
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration); // 부드러운 릴리즈
    
    osc.start(time);
    osc.stop(time + duration);
  }

  // 16분 음표 단위로 다음 스텝 시간 계산
  nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    const timeForStep = secondsPerBeat / 4; 
    this.nextNoteTime += timeForStep;
    this.step++;
  }

  // 테마별 스텝 스케줄링
  scheduleNote(stepNumber, time) {
    let note, type, duration, vol;

    if (this.currentTheme === 'theme-space-night') {
      // 몽환적인 마이너 아르페지오 (C Minor) + 느리고 넓은 공간감
      this.bpm = 90;
      const spaceSeq = [60, null, 63, null, 67, null, 72, null, 75, null, 72, null, 67, null, 63, null]; 
      note = spaceSeq[stepNumber % 16];
      type = 'sine'; // 부드러운 사인파
      duration = 0.5;
      vol = 0.2;
      
      // 베이스 코드 웅장하게 깔기 (1마디마다)
      if (stepNumber % 16 === 0) {
         this.playNote(48, time, 2.0, 'triangle', 0.15); // 낮은 C
      }
      
    } else if (this.currentTheme === 'theme-classic-chalk') {
      // 발랄하고 통통 튀는 교실 느낌 (C Major) - 빠른 템포
      this.bpm = 140;
      const chalkSeq = [60, 64, 67, 72, 67, 64, 60, 64, 65, 69, 72, 77, 72, 69, 65, 69];
      note = chalkSeq[stepNumber % 16];
      type = 'square'; // 레트로한 8비트 스퀘어파
      duration = 0.1; // 짧게 끊어치기(스타카토)
      vol = 0.05;
      
    } else if (this.currentTheme === 'theme-cyber-grid') {
      // 빠르고 긴박한 사이버펑크 추격전 베이스라인
      this.bpm = 135;
      // 엇박이 들어간 베이스 라인
      const cyberSeq = [36, 36, 48, 36, 36, 46, 36, 45, 36, 36, 48, 36, 36, 43, 36, 46];
      note = cyberSeq[stepNumber % 16];
      type = 'sawtooth'; // 강렬한 톱니파
      duration = 0.15;
      vol = 0.15;
      
      // 기계적인 하이햇 효과음 (8비트 엇박)
      if (stepNumber % 4 === 2) {
          this.playNote(90, time, 0.05, 'square', 0.02); // 틱!
      }
      // 킥 드럼 흉내 (1, 3 비트)
      if (stepNumber % 8 === 0) {
          this.playNote(24, time, 0.2, 'sine', 0.3); // 쿵!
      }
    }

    if (note) {
      this.playNote(note, time, duration, type, vol);
    }
  }

  // 무한 재생 스케줄러 루프
  scheduler() {
    if (!this.isPlaying) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.step, this.nextNoteTime);
      this.nextNote()
    }
    
    this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
  }

  setTheme(theme) {
    this.currentTheme = theme;
    // 테마가 바뀔 때 매끄러움을 위해 스텝을 유지하거나 초기화할 수 있지만, 템포가 다르므로 구조적 변환만 일어납니다.
  }

  start() {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.isPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05; // 50ms 후 시작
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.timerID);
  }
}
