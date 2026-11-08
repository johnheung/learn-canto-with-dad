import React from 'react';
import { Exercise, ScriptMode } from '@/lib/types';
import { BuildCantonese, BuildEnglish } from '@/components/exercises/BuildSentence';
import { CantoneseChoice } from '@/components/exercises/CantoneseChoice';
import { MatchPairs } from '@/components/exercises/MatchPairs';
import { MeaningChoice } from '@/components/exercises/MeaningChoice';
import { ToneQuiz } from '@/components/exercises/ToneQuiz';
import { TypeAnswer } from '@/components/exercises/TypeAnswer';

interface Props {
  exercise: Exercise;
  script: ScriptMode;
  sound: boolean;
  locked: boolean;
  onResult: (correct: boolean, correction?: string, given?: string) => void;
}

export function ExerciseView({ exercise, ...rest }: Props) {
  switch (exercise.kind) {
    case 'mc-meaning':
      return <MeaningChoice exercise={exercise} {...rest} />;
    case 'mc-cantonese':
    case 'listen':
      return <CantoneseChoice exercise={exercise} {...rest} />;
    case 'match':
      return <MatchPairs exercise={exercise} {...rest} />;
    case 'tone':
      return <ToneQuiz exercise={exercise} {...rest} />;
    case 'build-en':
      return <BuildEnglish exercise={exercise} {...rest} />;
    case 'build-yue':
      return <BuildCantonese exercise={exercise} {...rest} />;
    case 'type':
      return <TypeAnswer exercise={exercise} {...rest} />;
  }
}
