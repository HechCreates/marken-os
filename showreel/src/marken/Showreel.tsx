import React from "react"
import { AbsoluteFill, Sequence } from "remotion"
import { C, SCENES, TOTAL } from "./theme"
import { Title } from "./scenes/Title"
import { Before } from "./scenes/Before"
import { Stack } from "./scenes/Stack"
import { Layers } from "./scenes/Layers"
import { Screens } from "./scenes/Screens"
import { Numbers } from "./scenes/Numbers"
import { Closing } from "./scenes/Closing"

export const SHOWREEL_DURATION = TOTAL

/**
 * Sixty seconds at 30fps. Scene boundaries live in theme.ts so the timing can
 * be retimed in one place without touching any scene.
 */
export const Showreel: React.FC = () => (
  <AbsoluteFill style={{ background: C.page }}>
    <Sequence from={SCENES.title.from} durationInFrames={SCENES.title.dur}>
      <Title dur={SCENES.title.dur} />
    </Sequence>
    <Sequence from={SCENES.before.from} durationInFrames={SCENES.before.dur}>
      <Before dur={SCENES.before.dur} />
    </Sequence>
    <Sequence from={SCENES.stack.from} durationInFrames={SCENES.stack.dur}>
      <Stack dur={SCENES.stack.dur} />
    </Sequence>
    <Sequence from={SCENES.layers.from} durationInFrames={SCENES.layers.dur}>
      <Layers dur={SCENES.layers.dur} />
    </Sequence>
    <Sequence from={SCENES.screens.from} durationInFrames={SCENES.screens.dur}>
      <Screens dur={SCENES.screens.dur} />
    </Sequence>
    <Sequence from={SCENES.numbers.from} durationInFrames={SCENES.numbers.dur}>
      <Numbers dur={SCENES.numbers.dur} />
    </Sequence>
    <Sequence from={SCENES.closing.from} durationInFrames={SCENES.closing.dur}>
      <Closing dur={SCENES.closing.dur} />
    </Sequence>
  </AbsoluteFill>
)
