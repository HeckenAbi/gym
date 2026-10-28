"use client";

import { useEffect, useRef, useState } from "react";
import type { ExerciseMotion, LibraryExercise } from "../data/exercise-library";

type Point = { x: number; y: number };
type Pose = {
  head: Point;
  shoulders: [Point, Point];
  elbows: [Point, Point];
  hands: [Point, Point];
  hip: Point;
  knees: [Point, Point];
  feet: [Point, Point];
};
type PoseSequence = [Pose, Pose, Pose];

type SegmentProps = { from: Point[]; to: Point[]; active: boolean; width: number; className?: string };
const DURATION = "2.6s";
const KEY_TIMES = "0;0.5;1";
const KEY_SPLINES = "0.42 0 0.58 1;0.42 0 0.58 1";

const START_POSE: Pose = {
  head: { x: 240, y: 55 },
  shoulders: [{ x: 219, y: 84 }, { x: 261, y: 84 }],
  elbows: [{ x: 194, y: 111 }, { x: 286, y: 111 }],
  hands: [{ x: 184, y: 143 }, { x: 296, y: 143 }],
  hip: { x: 240, y: 153 },
  knees: [{ x: 222, y: 204 }, { x: 258, y: 204 }],
  feet: [{ x: 211, y: 252 }, { x: 269, y: 252 }],
};

function clonePose(): Pose {
  return JSON.parse(JSON.stringify(START_POSE)) as Pose;
}

function lyingPoses(motion: ExerciseMotion): PoseSequence {
  const start: Pose = {
    head: { x: 117, y: 142 }, shoulders: [{ x: 158, y: 120 }, { x: 158, y: 164 }],
    elbows: [{ x: 190, y: 120 }, { x: 190, y: 164 }], hands: [{ x: 211, y: 120 }, { x: 211, y: 164 }],
    hip: { x: 263, y: 142 }, knees: [{ x: 316, y: 128 }, { x: 316, y: 158 }], feet: [{ x: 374, y: 120 }, { x: 374, y: 164 }],
  };
  const end = JSON.parse(JSON.stringify(start)) as Pose;
  switch (motion) {
    case "press-horizontal":
      start.elbows = [{ x: 190, y: 118 }, { x: 190, y: 166 }];
      start.hands = [{ x: 211, y: 113 }, { x: 211, y: 171 }];
      end.elbows = [{ x: 185, y: 97 }, { x: 185, y: 187 }];
      end.hands = [{ x: 204, y: 77 }, { x: 204, y: 207 }];
      break;
    case "fly":
      start.elbows = [{ x: 184, y: 121 }, { x: 184, y: 163 }];
      start.hands = [{ x: 203, y: 120 }, { x: 203, y: 164 }];
      end.elbows = [{ x: 172, y: 101 }, { x: 172, y: 183 }];
      end.hands = [{ x: 177, y: 76 }, { x: 177, y: 208 }];
      break;
    case "pullover":
      start.elbows = [{ x: 193, y: 119 }, { x: 193, y: 165 }];
      start.hands = [{ x: 206, y: 118 }, { x: 206, y: 166 }];
      end.elbows = [{ x: 136, y: 119 }, { x: 136, y: 165 }];
      end.hands = [{ x: 96, y: 133 }, { x: 96, y: 151 }];
      break;
    case "triceps-lying":
      start.elbows = [{ x: 190, y: 117 }, { x: 190, y: 167 }];
      start.hands = [{ x: 211, y: 118 }, { x: 211, y: 166 }];
      end.elbows = [{ x: 190, y: 117 }, { x: 190, y: 167 }];
      end.hands = [{ x: 225, y: 79 }, { x: 225, y: 205 }];
      break;
  }
  return [start, end, start];
}

function posesFor(exercise: LibraryExercise): PoseSequence {
  const { motion } = exercise;
  if (exercise.position === "lying") return lyingPoses(motion);
  const start = clonePose();
  const end = clonePose();
  const [leftHand, rightHand] = end.hands;

  switch (motion) {
    case "press-horizontal":
      leftHand.x = 220; rightHand.x = 260; leftHand.y = rightHand.y = 97;
      start.hands = [{ x: 187, y: 148 }, { x: 293, y: 148 }];
      break;
    case "fly":
      start.hands = [{ x: 232, y: 112 }, { x: 248, y: 112 }];
      end.hands = [{ x: 153, y: 119 }, { x: 327, y: 119 }];
      start.elbows = [{ x: 205, y: 107 }, { x: 275, y: 107 }];
      end.elbows = [{ x: 175, y: 98 }, { x: 305, y: 98 }];
      break;
    case "pullover":
      start.hands = [{ x: 236, y: 99 }, { x: 244, y: 99 }];
      end.hands = [{ x: 231, y: 171 }, { x: 249, y: 171 }];
      start.elbows = [{ x: 210, y: 89 }, { x: 270, y: 89 }];
      end.elbows = [{ x: 211, y: 121 }, { x: 269, y: 121 }];
      break;
    case "row":
      start.hands = [{ x: 179, y: 139 }, { x: 301, y: 139 }];
      end.hands = [{ x: 217, y: 140 }, { x: 263, y: 140 }];
      end.elbows = [{ x: 207, y: 119 }, { x: 273, y: 119 }];
      break;
    case "shrug":
      end.shoulders = [{ x: 219, y: 70 }, { x: 261, y: 70 }];
      end.elbows = [{ x: 194, y: 99 }, { x: 286, y: 99 }];
      end.hands = [{ x: 184, y: 132 }, { x: 296, y: 132 }];
      break;
    case "press-overhead":
      start.hands = [{ x: 202, y: 112 }, { x: 278, y: 112 }];
      end.hands = [{ x: 209, y: 40 }, { x: 271, y: 40 }];
      end.elbows = [{ x: 202, y: 71 }, { x: 278, y: 71 }];
      break;
    case "raise-lateral":
      start.hands = [{ x: 192, y: 146 }, { x: 288, y: 146 }];
      end.hands = [{ x: 158, y: 91 }, { x: 322, y: 91 }];
      end.elbows = [{ x: 187, y: 101 }, { x: 293, y: 101 }];
      break;
    case "raise-front":
      start.hands = [{ x: 212, y: 145 }, { x: 268, y: 145 }];
      end.hands = [{ x: 205, y: 89 }, { x: 275, y: 89 }];
      end.elbows = [{ x: 203, y: 103 }, { x: 277, y: 103 }];
      break;
    case "rear-fly":
      start.hands = [{ x: 202, y: 132 }, { x: 278, y: 132 }];
      end.hands = [{ x: 145, y: 108 }, { x: 335, y: 108 }];
      end.elbows = [{ x: 184, y: 102 }, { x: 296, y: 102 }];
      break;
    case "curl":
      end.hands = [{ x: 211, y: 104 }, { x: 269, y: 104 }];
      end.elbows = [{ x: 197, y: 126 }, { x: 283, y: 126 }];
      break;
    case "curl-hammer":
    case "curl-rotation":
      end.hands = [{ x: 206, y: 107 }, { x: 274, y: 107 }];
      end.elbows = [{ x: 197, y: 126 }, { x: 283, y: 126 }];
      break;
    case "triceps-overhead":
      start.hands = [{ x: 232, y: 100 }, { x: 248, y: 100 }];
      start.elbows = [{ x: 211, y: 79 }, { x: 269, y: 79 }];
      end.hands = [{ x: 235, y: 34 }, { x: 245, y: 34 }];
      end.elbows = [{ x: 211, y: 75 }, { x: 269, y: 75 }];
      break;
    case "triceps-lying":
      start.hands = [{ x: 219, y: 73 }, { x: 261, y: 73 }];
      end.hands = [{ x: 226, y: 46 }, { x: 254, y: 46 }];
      end.elbows = [{ x: 205, y: 71 }, { x: 275, y: 71 }];
      break;
    case "triceps-kickback":
      start.hands = [{ x: 197, y: 139 }, { x: 283, y: 139 }];
      end.hands = [{ x: 168, y: 103 }, { x: 312, y: 103 }];
      start.elbows = [{ x: 202, y: 111 }, { x: 278, y: 111 }];
      end.elbows = [{ x: 202, y: 111 }, { x: 278, y: 111 }];
      break;
    case "triceps-pushdown":
      start.hands = [{ x: 202, y: 102 }, { x: 278, y: 102 }];
      start.elbows = [{ x: 200, y: 112 }, { x: 280, y: 112 }];
      end.hands = [{ x: 202, y: 158 }, { x: 278, y: 158 }];
      end.elbows = [{ x: 200, y: 112 }, { x: 280, y: 112 }];
      break;
    case "squat":
    case "cable-squat":
      end.hip.y = 183; end.head.y = 68;
      end.shoulders = [{ x: 217, y: 96 }, { x: 263, y: 96 }];
      end.knees = [{ x: 207, y: 216 }, { x: 273, y: 216 }];
      end.feet = [{ x: 204, y: 252 }, { x: 276, y: 252 }];
      end.elbows = [{ x: 192, y: 132 }, { x: 288, y: 132 }];
      end.hands = [{ x: 181, y: 160 }, { x: 299, y: 160 }];
      break;
    case "hinge":
    case "pull-through":
      end.head = { x: 263, y: 93 };
      end.shoulders = [{ x: 234, y: 112 }, { x: 274, y: 100 }];
      end.hip = { x: 244, y: 166 };
      end.elbows = [{ x: 203, y: 132 }, { x: 257, y: 128 }];
      end.hands = [{ x: 180, y: 173 }, { x: 234, y: 164 }];
      end.knees = [{ x: 221, y: 204 }, { x: 258, y: 204 }];
      break;
    case "lunge":
      start.feet = [{ x: 210, y: 252 }, { x: 292, y: 252 }];
      start.knees = [{ x: 214, y: 204 }, { x: 277, y: 220 }];
      end.feet = [{ x: 210, y: 252 }, { x: 292, y: 252 }];
      end.knees = [{ x: 205, y: 219 }, { x: 281, y: 201 }];
      end.hip.y = 183; end.head.y = 68;
      end.shoulders = [{ x: 219, y: 95 }, { x: 261, y: 95 }];
      break;
    case "step-up":
      start.feet = [{ x: 215, y: 252 }, { x: 265, y: 252 }];
      end.feet = [{ x: 215, y: 252 }, { x: 273, y: 232 }];
      end.knees = [{ x: 222, y: 204 }, { x: 263, y: 186 }];
      end.hip.y = 145;
      break;
    case "calf-raise":
      end.feet = [{ x: 211, y: 238 }, { x: 269, y: 238 }];
      end.knees = [{ x: 222, y: 198 }, { x: 258, y: 198 }];
      end.hip.y = 146;
      break;
    case "hip-thrust":
      start.hip.y = 180; start.shoulders = [{ x: 216, y: 148 }, { x: 264, y: 148 }];
      start.knees = [{ x: 211, y: 205 }, { x: 269, y: 205 }]; start.feet = [{ x: 203, y: 252 }, { x: 277, y: 252 }];
      end.hip.y = 145; end.shoulders = [{ x: 216, y: 148 }, { x: 264, y: 148 }];
      end.knees = [{ x: 211, y: 205 }, { x: 269, y: 205 }]; end.feet = [{ x: 203, y: 252 }, { x: 277, y: 252 }];
      end.head = { x: 221, y: 141 };
      break;
    case "pulldown":
      start.hands = [{ x: 206, y: 40 }, { x: 274, y: 40 }];
      start.elbows = [{ x: 198, y: 58 }, { x: 282, y: 58 }];
      end.hands = [{ x: 207, y: 129 }, { x: 273, y: 129 }];
      end.elbows = [{ x: 191, y: 103 }, { x: 289, y: 103 }];
      break;
    case "straight-pulldown":
      start.hands = [{ x: 189, y: 80 }, { x: 291, y: 80 }];
      end.hands = [{ x: 205, y: 158 }, { x: 275, y: 158 }];
      end.elbows = [{ x: 194, y: 124 }, { x: 286, y: 124 }];
      break;
    case "face-pull":
      start.hands = [{ x: 185, y: 132 }, { x: 295, y: 132 }];
      end.hands = [{ x: 220, y: 91 }, { x: 260, y: 91 }];
      end.elbows = [{ x: 168, y: 82 }, { x: 312, y: 82 }];
      break;
    case "upright-row":
      start.hands = [{ x: 208, y: 151 }, { x: 272, y: 151 }];
      end.hands = [{ x: 223, y: 97 }, { x: 257, y: 97 }];
      end.elbows = [{ x: 184, y: 92 }, { x: 296, y: 92 }];
      break;
    case "glute-kickback":
      start.feet = [{ x: 220, y: 252 }, { x: 270, y: 252 }];
      end.feet = [{ x: 220, y: 252 }, { x: 307, y: 221 }];
      end.knees = [{ x: 222, y: 204 }, { x: 271, y: 202 }];
      break;
    case "woodchop":
      start.hands = [{ x: 288, y: 85 }, { x: 306, y: 102 }];
      end.hands = [{ x: 177, y: 165 }, { x: 196, y: 179 }];
      end.elbows = [{ x: 195, y: 115 }, { x: 217, y: 131 }];
      break;
  }
  if (exercise.unilateral) {
    const rest = clonePose();
    start.shoulders[1] = { ...rest.shoulders[1] };
    end.shoulders[1] = { ...rest.shoulders[1] };
    start.elbows[1] = { ...rest.elbows[1] };
    end.elbows[1] = { ...rest.elbows[1] };
    start.hands[1] = { ...rest.hands[1] };
    end.hands[1] = { ...rest.hands[1] };
  }
  return [start, end, start];
}

function coords(points: Point[], key: "x" | "y") {
  return points.map((point) => point[key]).join(";");
}

function Segment({ from, to, active, width, className = "" }: SegmentProps) {
  return (
    <line x1={from[0].x} y1={from[0].y} x2={to[0].x} y2={to[0].y} className={className} strokeWidth={width} strokeLinecap="round" fill="none">
      {active && <>
        <animate attributeName="x1" values={coords(from, "x")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
        <animate attributeName="y1" values={coords(from, "y")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
        <animate attributeName="x2" values={coords(to, "x")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
        <animate attributeName="y2" values={coords(to, "y")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
      </>}
    </line>
  );
}

function AnimatedPoint({ points, active, radius, className = "" }: { points: Point[]; active: boolean; radius: number; className?: string }) {
  return (
    <circle cx={points[0].x} cy={points[0].y} r={radius} className={className}>
      {active && <>
        <animate attributeName="cx" values={coords(points, "x")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
        <animate attributeName="cy" values={coords(points, "y")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />
      </>}
    </circle>
  );
}

function AnimatedDumbbell({ points, active }: { points: Point[]; active: boolean }) {
  const values = points.map((point) => `${point.x} ${point.y}`).join(";");
  return (
    <g transform={`translate(${points[0].x} ${points[0].y})`} aria-hidden="true">
      <line x1="-15" y1="0" x2="15" y2="0" stroke="#e1e3e7" strokeWidth="4" strokeLinecap="round" />
      <rect x="-22" y="-8" width="7" height="16" rx="2" fill="#858a93" stroke="#d6d8dd" strokeWidth="1.5" />
      <rect x="-29" y="-6" width="5" height="12" rx="2" fill="#858a93" stroke="#d6d8dd" strokeWidth="1.5" />
      <rect x="15" y="-8" width="7" height="16" rx="2" fill="#858a93" stroke="#d6d8dd" strokeWidth="1.5" />
      <rect x="24" y="-6" width="5" height="12" rx="2" fill="#858a93" stroke="#d6d8dd" strokeWidth="1.5" />
      {active && <animateTransform attributeName="transform" type="translate" values={values} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />}
    </g>
  );
}

function limbPoints(poses: PoseSequence, getter: (pose: Pose) => Point) {
  return poses.map(getter);
}

function DemoFrame({ exercise, poses, active }: { exercise: LibraryExercise; poses: PoseSequence; active: boolean }) {
  const first = poses[0];
  const anchorY = exercise.cableAnchor === "high" ? 39 : exercise.cableAnchor === "low" ? 223 : 133;
  const leftPulleyX = 73;
  const rightPulleyX = 407;
  const leftHands = limbPoints(poses, (pose) => pose.hands[0]);
  const rightHands = limbPoints(poses, (pose) => pose.hands[1]);
  const isCable = exercise.equipment === "Kabelturm";
  const isLying = exercise.position === "lying";
  const singlePulleyX = exercise.cableAttachment === "foot" ? rightPulleyX : leftPulleyX;
  const cableTarget = exercise.cableAttachment === "foot" ? limbPoints(poses, (pose) => pose.feet[1]) : leftHands;
  const isSingleWeight = exercise.motion === "pullover" || exercise.motion === "triceps-overhead" || exercise.motion === "triceps-lying";
  const torsoPath = (pose: Pose) => isLying
    ? `M${pose.shoulders[0].x},${pose.shoulders[0].y} C190,111 228,120 ${pose.hip.x},${pose.hip.y - 17} L${pose.hip.x},${pose.hip.y + 17} C228,165 190,174 ${pose.shoulders[1].x},${pose.shoulders[1].y} Z`
    : `M${pose.shoulders[0].x},${pose.shoulders[0].y + 2} Q240,70 ${pose.shoulders[1].x},${pose.shoulders[1].y + 2} L${pose.hip.x + 17},${pose.hip.y} Q240,${pose.hip.y + 15} ${pose.hip.x - 17},${pose.hip.y} Z`;
  const weightCenter = poses.map((pose) => ({ x: (pose.hands[0].x + pose.hands[1].x) / 2, y: (pose.hands[0].y + pose.hands[1].y) / 2 }));

  return (
    <svg viewBox="0 0 480 290" role="img" aria-label={`Schematische Bewegungsanimation: ${exercise.name}`} className="h-full w-full">
      <defs>
        <linearGradient id={`shirt-${exercise.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9cbd1" /><stop offset="1" stopColor="#747982" /></linearGradient>
        <radialGradient id={`glow-${exercise.id}`}><stop offset="0" stopColor="#fff" stopOpacity=".12" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="240" cy="263" rx="145" ry="12" fill="#fff" opacity=".025" />
      <circle cx="240" cy="129" r="130" fill={`url(#glow-${exercise.id})`} />
      <path d="M80 256H400" stroke="#fff" strokeOpacity=".09" strokeWidth="1" />

      {isLying && (exercise.surface === "floor"
        ? <path d="M88 190H410" stroke="#9da1a9" strokeOpacity=".62" strokeWidth="5" strokeLinecap="round" />
        : <g aria-hidden="true"><path d={exercise.surface === "incline" ? "M135 178L294 165" : "M135 178H294"} stroke="#858a93" strokeWidth="8" strokeLinecap="round" /><path d="M158 181l-8 28M275 181l8 28" stroke="#656a73" strokeWidth="6" strokeLinecap="round" /><path d="M138 210h39M264 210h39" stroke="#656a73" strokeWidth="5" strokeLinecap="round" /></g>)}

      {isCable && <g aria-hidden="true">
        <path d={exercise.unilateral ? (exercise.cableAttachment === "foot" ? "M432 252V35h-22M411 252h31" : "M48 252V35h22M38 252h31") : "M48 252V35h22M432 252V35h-22M38 252h31M411 252h31"} fill="none" stroke="#717680" strokeOpacity=".72" strokeWidth="7" strokeLinecap="round" />
        {!exercise.unilateral && <path d="M48 40h22M410 40h22" stroke="#a8abb2" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />}
        {exercise.unilateral ? <>
          <circle cx={singlePulleyX} cy={anchorY} r="7" fill="#202228" stroke="#d2d4d9" strokeOpacity=".68" strokeWidth="3" />
          <Segment from={poses.map(() => ({ x: singlePulleyX, y: anchorY }))} to={cableTarget} active={active} width={2} className="stroke-[#bfc2c9]/55" />
        </> : <>
          <circle cx={leftPulleyX} cy={anchorY} r="7" fill="#202228" stroke="#d2d4d9" strokeOpacity=".68" strokeWidth="3" />
          <circle cx={rightPulleyX} cy={anchorY} r="7" fill="#202228" stroke="#d2d4d9" strokeOpacity=".68" strokeWidth="3" />
          <Segment from={poses.map(() => ({ x: leftPulleyX, y: anchorY }))} to={leftHands} active={active} width={2} className="stroke-[#bfc2c9]/55" />
          <Segment from={poses.map(() => ({ x: rightPulleyX, y: anchorY }))} to={rightHands} active={active} width={2} className="stroke-[#bfc2c9]/55" />
        </>}
      </g>}

      <g aria-hidden="true">
        <AnimatedPoint points={poses.map((pose) => pose.head)} active={active} radius={15} className="fill-[#e0c5ad] stroke-[#f0ded0]/55" />
        <path d={torsoPath(first)} fill={`url(#shirt-${exercise.id})`} opacity=".94">
          {active && <animate attributeName="d" values={poses.map(torsoPath).join(";")} keyTimes={KEY_TIMES} dur={DURATION} calcMode="spline" keySplines={KEY_SPLINES} repeatCount="indefinite" />}
        </path>
        <Segment from={poses.map((pose) => pose.hip)} to={poses.map((pose) => pose.knees[0])} active={active} width={14} className="stroke-[#777c85]" />
        <Segment from={poses.map((pose) => pose.knees[0])} to={poses.map((pose) => pose.feet[0])} active={active} width={13} className="stroke-[#777c85]" />
        <Segment from={poses.map((pose) => pose.hip)} to={poses.map((pose) => pose.knees[1])} active={active} width={14} className="stroke-[#777c85]" />
        <Segment from={poses.map((pose) => pose.knees[1])} to={poses.map((pose) => pose.feet[1])} active={active} width={13} className="stroke-[#777c85]" />
        <Segment from={poses.map((pose) => pose.shoulders[0])} to={poses.map((pose) => pose.elbows[0])} active={active} width={12} className="stroke-[#c8cbd1]" />
        <Segment from={poses.map((pose) => pose.elbows[0])} to={leftHands} active={active} width={10} className="stroke-[#e0c5ad]" />
        <Segment from={poses.map((pose) => pose.shoulders[1])} to={poses.map((pose) => pose.elbows[1])} active={active} width={12} className="stroke-[#c8cbd1]" />
        <Segment from={poses.map((pose) => pose.elbows[1])} to={rightHands} active={active} width={10} className="stroke-[#e0c5ad]" />
        <AnimatedPoint points={leftHands} active={active} radius={4.5} className="fill-[#e0c5ad]" />
        <AnimatedPoint points={rightHands} active={active} radius={4.5} className="fill-[#e0c5ad]" />
      </g>

      {!isCable && (isSingleWeight
        ? <AnimatedDumbbell points={weightCenter} active={active} />
        : <><AnimatedDumbbell points={leftHands} active={active} /><AnimatedDumbbell points={rightHands} active={active} /></>)}

      <g fontFamily="Arial, sans-serif" fontSize="10" fill="#b8bbc2" opacity=".62" aria-hidden="true">
        <text x="28" y="278">START</text><text x="365" y="278">KONTROLLIERT ZURÜCK</text>
      </g>
      <path d="M190 276h100" stroke="#d3d5da" strokeOpacity=".28" strokeWidth="1" />
    </svg>
  );
}

export function ExerciseAnimation({ exercise, compact = false, className = "" }: { exercise: LibraryExercise; compact?: boolean; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const poses = posesFor(exercise);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  const active = visible && !reduceMotion;
  const stillPoses = reduceMotion ? [poses[1], poses[1], poses[1]] as PoseSequence : poses;

  return (
    <div ref={containerRef} className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.065),transparent_68%),rgba(0,0,0,0.18)] ${compact ? "aspect-[16/10]" : "aspect-[16/9]"} ${className}`}>
      <DemoFrame exercise={exercise} poses={stillPoses} active={active} />
      <span className="absolute bottom-2 right-2 rounded-lg border border-white/[0.08] bg-black/45 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-white/45">
        {reduceMotion ? "Standbild · Bewegung reduziert" : "Animierte Demo"}
      </span>
    </div>
  );
}
