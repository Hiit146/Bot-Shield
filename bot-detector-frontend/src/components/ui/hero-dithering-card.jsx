import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection({ children }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="w-full min-h-screen flex flex-col items-center relative">
      <div 
        className="w-full flex-1 relative flex flex-col items-center justify-start pt-20 pb-12"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="absolute inset-0 z-0 pointer-events-none opacity-55 mix-blend-screen">
          <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
            <Dithering
              colorBack="#00000000" // Transparent
              colorFront="#c26015"  // Brighter orange accent
              shape="warp"
              type="4x4"
              speed={isHovered ? 0.6 : 0.2}
              className="size-full"
              minPixelRatio={1}
            />
          </Suspense>
        </div>

        <div className="relative z-10 px-6 w-full max-w-4xl mx-auto text-center flex flex-col items-center">
            
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/10 px-4 py-1.5 text-sm font-medium text-foreground backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground"></span>
              </span>
              AI-Powered Detection
            </div>

            {/* Headline */}
            <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-foreground mb-8 leading-[1.05]">
              Twitter Bot Detector, <br />
              <span className="text-foreground/80">delivered perfectly.</span>
            </h2>
            
            {/* Description */}
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
              Check if Twitter accounts are bots or humans using our advanced AI model.
              Clean, precise, and uniquely yours.
            </p>

            {/* Integrated Form / Children */}
            <div className="w-full max-w-4xl relative z-20 mt-8">
              {children}
            </div>
          </div>
      </div>
    </section>
  )
}
