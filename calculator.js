function crossfitApp() {
  return {
    currentView: "calculator",
    theme: "system",

    exercises: [
      { key: "snatch", name: "Snatch" },
      { key: "clean", name: "Clean" },
      { key: "jerk", name: "Jerk" },
      { key: "cleanJerk", name: "Clean & Jerk" },
      { key: "squat", name: "Back Squat" },
      { key: "frontSquat", name: "Front Squat" },
      { key: "deadlift", name: "Deadlift" },
      { key: "press", name: "Press" },
      { key: "pushPress", name: "Push Press" },
      { key: "benchPress", name: "Bench Press" },
    ],

    rms: {},
    rmUnits: {},
    availableWeights: { kg: [], lb: [] },
    availableWeightsInput: {
      kg: "1.25, 2.5, 5, 10, 15, 20, 25",
      lb: "2.5, 5, 10, 15, 25, 35, 45",
    },
    barbellWeight: { kg: 20 },

    selectedExercise: "snatch",
    percentage: 70,

    progressionExercise: "snatch",
    progressionStart: 60,
    progressionEnd: 85,
    progressionStep: 5,

    init() {
      this.initTheme();
      this.loadFromStorage();
      this.initializeDefaults();
      this.updateAvailableWeights("kg");
      this.updateAvailableWeights("lb");
    },

    initTheme() {
      const stored = localStorage.getItem("theme");
      this.theme = stored || "system";
      this.applyTheme();

      // Escuchar cambios en el tema del sistema
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (this.theme === "system") {
          this.applyTheme();
        }
      });
    },

    applyTheme() {
      const isDark =
        this.theme === "dark" ||
        (this.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },

    toggleTheme() {
      const themes = ["system", "light", "dark"];
      const currentIndex = themes.indexOf(this.theme);
      this.theme = themes[(currentIndex + 1) % themes.length];
      localStorage.setItem("theme", this.theme);
      this.applyTheme();
    },

    getThemeIcon() {
      return {
        system: "🖥️",
        light: "☀️",
        dark: "🌙",
      }[this.theme];
    },

    getThemeTitle() {
      return {
        system: "Cambiar a tema claro",
        light: "Cambiar a tema oscuro",
        dark: "Cambiar a tema sistema",
      }[this.theme];
    },

    initializeDefaults() {
      this.exercises.forEach((exercise) => {
        if (!this.rms[exercise.key]) this.rms[exercise.key] = 0;
        if (!this.rmUnits[exercise.key]) this.rmUnits[exercise.key] = "kg";
      });
    },

    saveToStorage() {
      const data = {
        rms: this.rms,
        rmUnits: this.rmUnits,
        availableWeights: this.availableWeights,
        availableWeightsInput: this.availableWeightsInput,
        barbellWeight: this.barbellWeight,
      };
      localStorage.setItem("crossfit-config", JSON.stringify(data));
    },

    loadFromStorage() {
      try {
        const dataStr = localStorage.getItem("crossfit-config");
        if (dataStr) {
          const data = JSON.parse(dataStr);
          this.rms = data.rms || {};
          this.rmUnits = data.rmUnits || {};
          this.availableWeights = data.availableWeights || { kg: [], lb: [] };
          this.availableWeightsInput = data.availableWeightsInput || {
            kg: "1.25, 2.5, 5, 10, 15, 20, 25",
            lb: "2.5, 5, 10, 15, 25, 35, 45",
          };
          this.barbellWeight = data.barbellWeight || { kg: 20 };
        }
      } catch (e) {
        console.error("Error loading from storage:", e);
      }
    },

    updateAvailableWeights(unit) {
      const input = this.availableWeightsInput[unit];
      if (input) {
        this.availableWeights[unit] = input
          .split(",")
          .map((w) => parseFloat(w.trim()))
          .filter((w) => !isNaN(w))
          .sort((a, b) => a - b);
      }
      this.saveToStorage();
    },

    calculateClosestWeight(exercise, percentage) {
      const rm = this.rms[exercise];
      const unit = this.rmUnits[exercise];

      if (!rm || rm <= 0) return "Configura tu RM";

      const targetWeight = (rm * percentage) / 100;
      const availablePlates = this.availableWeights[unit] || [];
      const barbellWeight =
        this.barbellWeight[unit] || (unit === "kg" ? 20 : 45);

      if (availablePlates.length === 0) return "Configura pesos disponibles";

      const weightNeeded = targetWeight - barbellWeight;
      if (weightNeeded <= 0) return `${barbellWeight} ${unit} (solo barra)`;

      const weightPerSide = weightNeeded / 2;
      let bestCombination = this.findBestPlatesCombination(
        weightPerSide,
        availablePlates
      );

      if (bestCombination.length === 0) {
        const maxAvailable = Math.max(...availablePlates);
        bestCombination = [maxAvailable];
      }

      const totalWeight =
        barbellWeight +
        bestCombination.reduce((sum, plate) => sum + plate, 0) * 2;
      const platesText = bestCombination
        .map((plate) => `${plate} ${unit}`)
        .join(" + ");

      return `${totalWeight} ${unit} (${platesText} c/lado)`;
    },

    findBestPlatesCombination(targetWeight, availablePlates) {
      const plates = [...availablePlates].sort((a, b) => b - a);
      let combination = [];
      let remaining = targetWeight;

      for (let plate of plates) {
        while (remaining >= plate && remaining > 0) {
          combination.push(plate);
          remaining -= plate;
          if (Math.abs(remaining) < 0.01) break;
        }
      }

      return combination.sort((a, b) => b - a);
    },

    generateProgression() {
      const progression = [];
      const rm = this.rms[this.progressionExercise];

      if (!rm || rm <= 0) return [];

      for (
        let p = this.progressionStart;
        p <= this.progressionEnd;
        p += this.progressionStep
      ) {
        const theoretical = Math.round(((rm * p) / 100) * 100) / 100;
        const suggested = this.calculateClosestWeight(
          this.progressionExercise,
          p
        );

        progression.push({
          percentage: p,
          theoretical: theoretical,
          suggested: suggested,
        });
      }

      return progression;
    },
  };
}
