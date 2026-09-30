import { TrainerType } from "#enums/trainer-type";

export function isFracturaRival(trainerType: TrainerType | undefined): boolean {
  return (
    trainerType !== undefined
    && [
      TrainerType.RIVAL,
      TrainerType.RIVAL_2,
      TrainerType.RIVAL_3,
      TrainerType.RIVAL_4,
      TrainerType.RIVAL_5,
      TrainerType.RIVAL_6,
    ].includes(trainerType)
  );
}
