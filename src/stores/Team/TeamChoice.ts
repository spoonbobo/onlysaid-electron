import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TeamChoiceState {
    selectedTeam: number; // 0: Home, 1: One, 2: Two, 3: Three
    setSelectedTeam: (index: number) => void;
}

export const useTeamChoice = create<TeamChoiceState>()(
    persist(
        (set) => ({
            selectedTeam: 0,
            setSelectedTeam: (index) => set({ selectedTeam: index }),
        }),
        {
            name: "team-choice",
        }
    )
);
