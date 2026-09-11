import { ApiLectureParams } from '../types/player';

export const DEFAULT_LECTURES: (ApiLectureParams & { id: string; description: string; topic: string })[] = [
  {
    id: 'lecture-1',
    title: 'Lecture 1: Core Fundamentals & Concept Breakdown',
    topic: 'Mathematics & Algorithms',
    description: 'Authorized backend stream with MPEG-DASH and ClearKey DRM protection.',
    batchId: '698ad3519549b300a5e1cc6a',
    subjectId: 'hehe',
    lectureId: '6a7ecfc310002885ba91700c',
    key: 'Sharma',
    durationEstimate: '42 mins',
  },
  {
    id: 'lecture-2',
    title: 'Lecture 2: Advanced Problem Solving & Case Studies',
    topic: 'Applied Practice',
    description: 'Sequential lecture to test player destruction, listener cleanup, and position isolation.',
    batchId: '698ad3519549b300a5e1cc6a',
    subjectId: 'hehe',
    lectureId: '7b8f0dc421113996cb02811d',
    key: 'Sharma',
    durationEstimate: '38 mins',
  },
];
