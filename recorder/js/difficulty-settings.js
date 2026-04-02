
(function() {
  // -10 to 10 mapped, 5% each steps. Total 21 steps.
  // indices: 0 to 20.
  // Middle is index 10 (value 0).
  const diffLabels = [];
  const diffBonuses = [];

  for (let i = -10; i <= 10; i++) {
    const percentage = Math.abs(i) * 5;
    const bonusValue = i * 0.05; // -0.50 to 0.50
    diffBonuses.push(bonusValue);

    if (i < 0) {
      diffLabels.push('+' + percentage + '%概率 抽到记录中已有的标签');
    } else if (i > 0) {
      diffLabels.push('+' + percentage + '%概率 抽到记录中没有的标签');
    } else {
      diffLabels.push('正常');
    }
  }

  class DifficultyManager {
    constructor() {
      this.level = 0; // -10 to 10
      this.guaranteeThreshold = 0; 
      this.syncTimer = null;
      this.syncDelay = 5000;
      this.load();
      this.initUI();
    }

    load() {
      const saved = localStorage.getItem('recorder_difficulty');
      if (saved !== null) {
        this.level = parseInt(saved, 10);
        if (isNaN(this.level) || this.level < -10 || this.level > 10) {
          this.level = 0;
        }
      }

      const savedThreshold = localStorage.getItem('recorder_difficulty_guarantee_threshold');
      if (savedThreshold !== null) {
        this.guaranteeThreshold = parseInt(savedThreshold, 10);
        if (![0, 5, 10, 15, 20].includes(this.guaranteeThreshold)) {
          this.guaranteeThreshold = 0;
        }
      }
    }

    save() {
      // Don't save viewer's received state
      if (window.__onlineMode && !window.__onlineMode.isHost() && window.__onlineMode.getLastSyncedPayload()) {
        return;
      }
      localStorage.setItem('recorder_difficulty', this.level);
      localStorage.setItem('recorder_difficulty_guarantee_threshold', this.guaranteeThreshold);
    }

    initUI() {
      window.addEventListener('DOMContentLoaded', () => {
        this.updateBadge(); // Initial badge render
        const slider = document.getElementById('difficultySlider');
        const label = document.getElementById('difficultyLabel');
        const guaranteeSlider = document.getElementById('difficultyGuaranteeSlider');
        const guaranteeLabel = document.getElementById('difficultyGuaranteeLabel');
        if (!slider || !label || !guaranteeSlider || !guaranteeLabel) return;

        slider.value = this.level;
        this.updateLabel(this.level, label);
        guaranteeSlider.value = this.thresholdToSliderValue(this.guaranteeThreshold);
        this.updateGuaranteeLabel(this.guaranteeThreshold, guaranteeLabel);

        slider.addEventListener('input', (e) => {
          this.level = parseInt(e.target.value, 10);
          this.updateLabel(this.level, label);
          this.updateBadge();
          this.save();
          this.scheduleSync(false);
        });

        slider.addEventListener('change', () => {
          this.scheduleSync(false);
        });

        guaranteeSlider.addEventListener('input', (e) => {
          const sliderVal = parseInt(e.target.value, 10);
          this.guaranteeThreshold = this.sliderValueToThreshold(sliderVal);
          this.updateGuaranteeLabel(this.guaranteeThreshold, guaranteeLabel);
          this.updateBadge();
          this.save();
          this.scheduleSync(false);
        });

        guaranteeSlider.addEventListener('change', () => {
          this.scheduleSync(false);
        });
      });
    }

    scheduleSync(immediate) {
      if (!(window.__recorder_actions && window.__recorder_actions.pushStateChange)) {
        return;
      }

      if (this.syncTimer) {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
      }

      if (immediate) {
        window.__recorder_actions.pushStateChange();
        return;
      }

      this.syncTimer = setTimeout(() => {
        this.syncTimer = null;
        window.__recorder_actions.pushStateChange();
      }, this.syncDelay);
    }

    getCompactHintText(level) {
      if (level === 0) return '正常';
      const pct = Math.abs(level) * 5;
      return level < 0 ? ('+' + pct + '%爽度') : ('+' + pct + '%牢度');
    }

    sliderValueToThreshold(val) {
      if (val <= 0) return 0;
      return val * 5;
    }

    thresholdToSliderValue(threshold) {
      if (!threshold || threshold <= 0) return 0;
      return Math.round(threshold / 5);
    }

    updateGuaranteeLabel(threshold, labelNode) {
      if (!labelNode) return;
      if (!threshold) {
        labelNode.textContent = '关闭';
      } else {
        labelNode.textContent = '可用角色≤' + threshold + '时，抽中已有标签概率+50%';
      }
    }

    setGuaranteeThreshold(threshold) {
      const parsed = parseInt(threshold, 10);
      if (![0, 5, 10, 15, 20].includes(parsed)) {
        this.guaranteeThreshold = 0;
      } else {
        this.guaranteeThreshold = parsed;
      }

      const guaranteeSlider = document.getElementById('difficultyGuaranteeSlider');
      const guaranteeLabel = document.getElementById('difficultyGuaranteeLabel');
      if (guaranteeSlider && guaranteeLabel) {
        guaranteeSlider.value = this.thresholdToSliderValue(this.guaranteeThreshold);
        this.updateGuaranteeLabel(this.guaranteeThreshold, guaranteeLabel);
      }

      this.updateBadge();
    }

    setLevel(val) {
        this.level = val;
        // Update UI if it exists
        const slider = document.getElementById('difficultySlider');
        const label = document.getElementById('difficultyLabel');
        if (slider && label) {
            slider.value = this.level;
            this.updateLabel(this.level, label);
        }
        this.updateBadge();
    }

    updateBadge() {
        const hint = document.getElementById('difficultyHint');
        const hintLine2 = document.getElementById('difficultyHintLine2');
        const hintLine3 = document.getElementById('difficultyHintLine3');
        const badge = document.getElementById('difficultyBadge');
        const badgeText = document.getElementById('difficultyBadgeText');
        const idx = this.level + 10;

        if (hint && hintLine2) {
          if (this.level === 0 && this.guaranteeThreshold === 0) {
            hint.classList.add('hidden');
          } else {
            hint.classList.remove('hidden');
            if (this.level !== 0) {
              hintLine2.textContent = this.getCompactHintText(this.level);
              hintLine2.classList.remove('hidden');
            } else {
              hintLine2.classList.add('hidden');
              hintLine2.textContent = '';
            }

            if (hintLine3) {
              if (this.guaranteeThreshold > 0) {
                hintLine3.textContent = '≤' + this.guaranteeThreshold + '时兜底';
                hintLine3.classList.remove('hidden');
              } else {
                hintLine3.textContent = '';
                hintLine3.classList.add('hidden');
              }
            }
          }
        }

        // Backward compatibility if old badge DOM exists
        if (badge && badgeText) {
          if (this.level === 0) {
            badge.style.display = 'none';
          } else {
            badge.style.display = 'flex';
            badgeText.textContent = diffLabels[idx];
          }
        }
    }

    updateLabel(val, labelNode) {
      const idx = val + 10;
      labelNode.textContent = diffLabels[idx];
    }

    pick(arr, category, recordSet) {
      if (!arr || arr.length === 0) return null;
      if (!recordSet || !recordSet[category]) {
        return arr[Math.floor(Math.random() * arr.length)];
      }

      const currentRecord = recordSet[category];
      if (currentRecord.size === 0 || currentRecord.size === arr.length) {
        return arr[Math.floor(Math.random() * arr.length)];
      }

      const bonus = diffBonuses[this.level + 10]; 
      const baseInProb = currentRecord.size / arr.length;
      
      let targetInProb = baseInProb - bonus;

      if (this.guaranteeThreshold > 0 && window.__recorder_actions && typeof window.__recorder_actions.getAvailableCount === 'function') {
        const availableCount = window.__recorder_actions.getAvailableCount();
        if (typeof availableCount === 'number' && availableCount <= this.guaranteeThreshold) {
          targetInProb += 0.5;
        }
      }
      
      if (targetInProb < 0) targetInProb = 0;
      if (targetInProb > 1) targetInProb = 1;

      const r = Math.random();
      if (r < targetInProb) {
        const inArr = arr.filter(x => currentRecord.has(x));
        return inArr[Math.floor(Math.random() * inArr.length)];
      } else {
        const outArr = arr.filter(x => !currentRecord.has(x));
        return outArr[Math.floor(Math.random() * outArr.length)];
      }
    }
  }

  window.__difficulty_manager = new DifficultyManager();
})();

