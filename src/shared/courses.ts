import type { CourseDef } from './types';

/**
 * 三个自编赛场。世界坐标固定 1200×800，渲染层等比缩放。
 * 门的 approach 点位于「来向侧」，用于判定穿过方向，避免反向穿过误判。
 */
export const COURSES: CourseDef[] = [
  {
    id: 'green-pasture',
    name: '青坡牧场',
    description: '缓坡直道，三道门一字排开，障碍少。适合第一次下口令。',
    width: 1200,
    height: 800,
    handler: { x: 110, y: 400 },
    hill: { center: { x: 1030, y: 400 }, radius: 95 },
    gates: [
      {
        id: 0,
        a: { x: 800, y: 330 },
        b: { x: 800, y: 470 },
        approach: { x: 900, y: 400 },
      },
      {
        id: 1,
        a: { x: 560, y: 330 },
        b: { x: 560, y: 470 },
        approach: { x: 680, y: 400 },
      },
      {
        id: 2,
        a: { x: 320, y: 330 },
        b: { x: 320, y: 470 },
        approach: { x: 440, y: 400 },
      },
    ],
    pen: {
      center: { x: 140, y: 400 },
      radius: 78,
      opening: 56,
      openingAngle: Math.PI, // 缺口朝右（+x 方向来羊）
    },
    grass: [
      { center: { x: 1030, y: 400 }, radius: 110, strength: 1.0 },
      { center: { x: 690, y: 180 }, radius: 80, strength: 0.7 },
      { center: { x: 430, y: 630 }, radius: 85, strength: 0.75 },
    ],
    obstacles: [
      { center: { x: 680, y: 620 }, radius: 34 },
      { center: { x: 700, y: 180 }, radius: 28 },
    ],
    timeLimit: 240,
  },
  {
    id: 'winding-valley',
    name: '蜿蜒谷地',
    description: 'S 形门线，树丛与岩石夹道，羊群容易在弯道被草地吸偏。',
    width: 1200,
    height: 800,
    handler: { x: 100, y: 690 },
    hill: { center: { x: 1050, y: 150 }, radius: 90 },
    gates: [
      {
        id: 0,
        a: { x: 880, y: 150 },
        b: { x: 980, y: 250 },
        approach: { x: 1000, y: 120 },
      },
      {
        id: 1,
        a: { x: 700, y: 430 },
        b: { x: 820, y: 470 },
        approach: { x: 850, y: 330 },
      },
      {
        id: 2,
        a: { x: 430, y: 560 },
        b: { x: 470, y: 680 },
        approach: { x: 560, y: 640 },
      },
      {
        id: 3,
        a: { x: 240, y: 560 },
        b: { x: 200, y: 450 },
        approach: { x: 330, y: 520 },
      },
    ],
    obstacles: [
      { center: { x: 840, y: 350 }, radius: 40 },
      { center: { x: 600, y: 250 }, radius: 36 },
      { center: { x: 560, y: 500 }, radius: 30 },
      { center: { x: 300, y: 280 }, radius: 42 },
      { center: { x: 950, y: 550 }, radius: 32 },
    ],
    pen: {
      center: { x: 130, y: 470 },
      radius: 72,
      opening: 54,
      openingAngle: 0.35,
    },
    grass: [
      { center: { x: 1050, y: 150 }, radius: 100, strength: 1.0 },
      { center: { x: 700, y: 200 }, radius: 75, strength: 0.8 },
      { center: { x: 380, y: 720 }, radius: 80, strength: 0.85 },
      { center: { x: 180, y: 180 }, radius: 70, strength: 0.65 },
    ],
    timeLimit: 300,
  },
  {
    id: 'high-moor',
    name: '高寒荒原',
    description: '大风荒原，门线长、草地稀疏，脾性躁的羊在开阔地更容易脱群。',
    width: 1200,
    height: 800,
    handler: { x: 600, y: 720 },
    hill: { center: { x: 600, y: 110 }, radius: 100 },
    gates: [
      {
        id: 0,
        a: { x: 380, y: 260 },
        b: { x: 500, y: 230 },
        approach: { x: 520, y: 150 },
      },
      {
        id: 1,
        a: { x: 840, y: 360 },
        b: { x: 800, y: 480 },
        approach: { x: 760, y: 330 },
      },
      {
        id: 2,
        a: { x: 560, y: 540 },
        b: { x: 450, y: 580 },
        approach: { x: 600, y: 470 },
      },
    ],
    obstacles: [
      { center: { x: 240, y: 400 }, radius: 44 },
      { center: { x: 960, y: 180 }, radius: 38 },
      { center: { x: 900, y: 640 }, radius: 46 },
      { center: { x: 180, y: 640 }, radius: 30 },
    ],
    pen: {
      center: { x: 600, y: 660 },
      radius: 76,
      opening: 58,
      openingAngle: -Math.PI / 2,
    },
    grass: [
      { center: { x: 600, y: 110 }, radius: 105, strength: 0.9 },
      { center: { x: 1050, y: 300 }, radius: 70, strength: 0.6 },
      { center: { x: 250, y: 520 }, radius: 70, strength: 0.6 },
    ],
    timeLimit: 270,
  },
];

export const getCourse = (id: string): CourseDef =>
  COURSES.find((c) => c.id === id) ?? COURSES[0];
