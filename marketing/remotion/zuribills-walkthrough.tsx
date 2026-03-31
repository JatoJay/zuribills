import { springTiming, TransitionSeries } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import {
  SCENE_INTRO_DURATION,
  SCENE_CATALOG_DURATION,
  SCENE_INVOICE_DURATION,
  SCENE_DASHBOARD_DURATION,
  SCENE_CTA_DURATION,
  TRANSITION_DURATION,
} from "../constants-zuribills";
import { ZBIntroScene } from "../scenes-zuribills/intro";
import { ServiceCatalogScene } from "../scenes-zuribills/service-catalog";
import { InvoicePaymentScene } from "../scenes-zuribills/invoice-payment";
import { ZBDashboardScene } from "../scenes-zuribills/ai-dashboard";
import { ZBCTAScene } from "../scenes-zuribills/cta";

export const ZuriBillsWalkthrough: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Intro / Hook */}
      <TransitionSeries.Sequence durationInFrames={SCENE_INTRO_DURATION}>
        <ZBIntroScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION,
        })}
      />

      {/* Scene 2: Service Catalog */}
      <TransitionSeries.Sequence durationInFrames={SCENE_CATALOG_DURATION}>
        <ServiceCatalogScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION,
        })}
      />

      {/* Scene 3: Invoice & Payment */}
      <TransitionSeries.Sequence durationInFrames={SCENE_INVOICE_DURATION}>
        <InvoicePaymentScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION,
        })}
      />

      {/* Scene 4: AI Dashboard (hero scene) */}
      <TransitionSeries.Sequence durationInFrames={SCENE_DASHBOARD_DURATION}>
        <ZBDashboardScene />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={springTiming({
          config: { damping: 200 },
          durationInFrames: TRANSITION_DURATION,
        })}
      />

      {/* Scene 5: CTA */}
      <TransitionSeries.Sequence durationInFrames={SCENE_CTA_DURATION}>
        <ZBCTAScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
