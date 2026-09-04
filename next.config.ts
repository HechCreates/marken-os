import type { NextConfig } from "next"

const config: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./markeninternaltool.framer.website/**", "./MarkenOs overrides/**"],
  },
}

export default config
