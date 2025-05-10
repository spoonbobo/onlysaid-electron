import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "../../utils/toast";

interface UserLevelState {
    level: number;
    experience: number;
    experienceToNextLevel: number;
    gainExperience: (amount: number) => void;
    resetExperience: () => void;
    levelUp: (addedXP: number) => void;
}

// Helper function to calculate experience needed for next level
const calculateExperienceForLevel = (level: number): number => {
    // Simple formula: each level requires 50 * current level points
    return 50 * level;
};

export const useUserLevelStore = create<UserLevelState>()(
    persist(
        (set, get) => ({
            level: 1,
            experience: 0,
            experienceToNextLevel: calculateExperienceForLevel(1),

            gainExperience: (amount: number) => {
                const { level, experience, experienceToNextLevel } = get();
                let newExperience = experience + amount;
                let newLevel = level;
                let newExperienceToNextLevel = experienceToNextLevel;

                // Check if user levels up
                while (newExperience >= newExperienceToNextLevel) {
                    newExperience -= newExperienceToNextLevel;
                    newLevel++;
                    newExperienceToNextLevel = calculateExperienceForLevel(newLevel);

                    // Show toast notification when leveling up
                    toast.success(`Level up! You are now level ${newLevel}!`);
                }

                set({
                    level: newLevel,
                    experience: newExperience,
                    experienceToNextLevel: newExperienceToNextLevel
                });
            },

            resetExperience: () => set({
                level: 1,
                experience: 0,
                experienceToNextLevel: calculateExperienceForLevel(1)
            }),

            levelUp: (addedXP: number) => {
                const { level } = get();
                const newLevel = level + 1;
                const newExperienceToNextLevel = calculateExperienceForLevel(newLevel);

                set({
                    level: newLevel,
                    experience: addedXP,
                    experienceToNextLevel: newExperienceToNextLevel
                });

                // Show toast notification
                toast.success(`Level up! You are now level ${newLevel}!`);
            }
        }),
        {
            name: "user-level-storage"
        }
    )
);