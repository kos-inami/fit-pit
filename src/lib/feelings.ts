export interface FeelingOption {
  value: string;
  emoji: string;
  label: string;
}

export const FEELINGS: FeelingOption[] = [
  { value: "crushed", emoji: "🤪", label: "Crushed" },
  { value: "strong",  emoji: "🤩", label: "Strong"  },
  { value: "good",    emoji: "😊", label: "Good"    },
  { value: "okay",    emoji: "😐", label: "Okay"    },
  { value: "tired",   emoji: "😴", label: "Tired"   },
];
