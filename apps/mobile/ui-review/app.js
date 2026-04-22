const screens = [
  {
    id: "onboarding",
    group: "core",
    tag: "Core",
    route: "/onboarding",
    title: "Onboarding",
    subtitle: "Entry into profile setup, fit intelligence, try-on, and retail comparison.",
    focus: "Check the premium first impression, value hierarchy, and whether the setup CTA is strong enough.",
    primaryCta: "Start setup",
    nextRoutes: ["/auth", "/profile", "/discover"],
    tabs: [],
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Fashion Tech</div>
          <h3>Find your best fit faster</h3>
          <p>Profile, measurements, try-on, and recommendations in one premium setup path.</p>
          <div class="pill-row">
            <span class="pill accent">Profile + fit + try-on + shopping</span>
          </div>
          <p>Outfit planning, fit confidence, and retail visibility are already connected. This screen should make the product feel like a complete wardrobe workflow from the first tap.</p>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Journey</div>
              <div class="metric-value">4 steps</div>
              <div class="metric-copy">Onboard, profile, measure, discover</div>
            </div>
            <div class="metric">
              <div class="metric-label">Signal</div>
              <div class="metric-value">Fit-first</div>
              <div class="metric-copy">Recommendations stay grounded in profile data</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/auth">Start setup</button>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">What You Unlock</div>
          <h3>A wardrobe workflow, not just a catalog</h3>
          <div class="feature-row">
            <strong>Profile intelligence</strong>
            <p>Build a fit-aware identity with measurements, preferences, and body-shape context.</p>
          </div>
          <div class="feature-row">
            <strong>Try-on preview</strong>
            <p>Upload a clean look, queue generation, and review confidence before you shop.</p>
          </div>
          <div class="feature-row">
            <strong>Retail comparison</strong>
            <p>Compare ready-to-buy offers across connected partners without breaking the flow.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "auth",
    group: "core",
    tag: "Core",
    route: "/auth",
    title: "Auth",
    subtitle: "Login and registration route with the current premium visual language.",
    focus: "Review form spacing, trust signals, mode switching, and whether account creation feels lightweight.",
    primaryCta: "Enter FitMe",
    nextRoutes: ["/profile"],
    tabs: [],
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Member Access</div>
          <h3>Return to your fit profile</h3>
          <p>Keep measurements, recommendations, and try-on progress connected across sessions.</p>
          <div class="pill-row">
            <span class="pill accent">Secure sign in</span>
            <span class="pill neutral">JWT session</span>
          </div>
          <div class="toggle-bar">
            <div class="toggle-pill active">Sign in</div>
            <div class="toggle-pill">Create account</div>
          </div>
          <div class="input">Email</div>
          <div class="input">Password</div>
          <div class="cta-row">
            <button class="button primary" data-route="/profile">Enter FitMe</button>
          </div>
          <p>Need an account? Create one</p>
        </div>
      </div>
    `
  },
  {
    id: "profile",
    group: "core",
    tag: "Core",
    route: "/profile",
    title: "Profile",
    subtitle: "Profile-management surface that powers fit, recommendations, and growth incentives.",
    focus: "Review whether identity, style preference, and profile completion feel clear and high-value.",
    primaryCta: "Measurements",
    nextRoutes: ["/measurements", "/discover", "/rewards"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Profile",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Profile Management</div>
          <h3>Demo User</h3>
          <p>Control the personal signals that feed fit scoring, discovery ranking, and try-on context.</p>
          <div class="pill-row">
            <span class="pill success">4/4 profile signals set</span>
            <span class="pill neutral">Athletic</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Height</div>
              <div class="metric-value">168 cm</div>
              <div class="metric-copy">Used in fit calibration</div>
            </div>
            <div class="metric">
              <div class="metric-label">Palette</div>
              <div class="metric-value">4</div>
              <div class="metric-copy">Preferred color anchors</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Avoided</div>
              <div class="metric-value">1</div>
              <div class="metric-copy">Colors to de-prioritize</div>
            </div>
            <div class="metric">
              <div class="metric-label">Styles</div>
              <div class="metric-value">3</div>
              <div class="metric-copy">Saved preference tags</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Next Actions</div>
          <h3>Complete your fit profile</h3>
          <div class="feature-row">
            <strong>Update measurements</strong>
            <p>Turn the profile into a usable sizing signal before discovery.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/measurements">Measurements</button>
            <button class="button secondary" data-route="/discover">Go to discover</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "measurements",
    group: "core",
    tag: "Core",
    route: "/measurements",
    title: "Measurements",
    subtitle: "Fit calibration input screen used for scoring and product confidence.",
    focus: "Review scanability of measurement coverage and whether next actions are obvious.",
    primaryCta: "Go to discover",
    nextRoutes: ["/discover", "/tryon-upload"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Profile",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Profile Management</div>
          <h3>Body measurements</h3>
          <p>These values drive fit scoring, recommendation confidence, and sizing decisions across the experience.</p>
          <div class="pill-row">
            <span class="pill success">Coverage 5/6</span>
            <span class="pill neutral">seed</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Chest</div>
              <div class="metric-value">91 cm</div>
            </div>
            <div class="metric">
              <div class="metric-label">Waist</div>
              <div class="metric-value">74 cm</div>
            </div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Hips</div>
              <div class="metric-value">97 cm</div>
            </div>
            <div class="metric">
              <div class="metric-label">Inseam</div>
              <div class="metric-value">79 cm</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Next Actions</div>
          <h3>Use this data</h3>
          <div class="cta-row">
            <button class="button primary" data-route="/discover">Go to discover</button>
            <button class="button secondary" data-route="/tryon-upload">Run try-on with current profile</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "discover",
    group: "core",
    tag: "Core",
    route: "/discover",
    title: "Discover",
    subtitle: "Fit-aware catalog entry point connected to try-on and recommendation flows.",
    focus: "Check hero hierarchy, card density, and how directly this screen moves a user into try-on.",
    primaryCta: "Start try-on",
    nextRoutes: ["/tryon-upload", "/recommendations"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Discover</div>
          <h3>Fit-aware picks for your next look</h3>
          <p>The catalog is already connected to sizing, style, and try-on flows, so you can move straight from browsing to confidence.</p>
          <div class="pill-row">
            <span class="pill accent">Live catalog</span>
            <span class="pill neutral">5 featured pieces</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Featured brand</div>
              <div class="metric-value">Northline</div>
            </div>
            <div class="metric">
              <div class="metric-label">Category</div>
              <div class="metric-value">outerwear</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/tryon-upload">Start try-on</button>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Featured Feed</div>
          <h3>Curated right now</h3>
          <div class="feed-card">
            <strong>Commuter Jacket</strong>
            <p>Northline • outerwear • black. Hero piece for fit-aware discovery and retail comparison.</p>
          </div>
          <div class="feed-card">
            <strong>Trail Overshirt</strong>
            <p>Northline • tops • olive. Ready for try-on and recommendation routing.</p>
          </div>
          <div class="feed-card">
            <strong>Wool Blend Blazer</strong>
            <p>Atelier Mono • outerwear • charcoal. Strong interview-ready candidate.</p>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "tryon-upload",
    group: "core",
    tag: "Core",
    route: "/tryon-upload",
    title: "Try-On Upload",
    subtitle: "Upload gateway into the queued try-on pipeline.",
    focus: "Review the upload affordance, trust language, and whether the system state feels production-safe.",
    primaryCta: "Upload and queue try-on",
    nextRoutes: ["/tryon-result"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Try-On Input</div>
          <h3>Upload a clean front-facing photo</h3>
          <p>The current flow uses the real upload pipeline, then creates a queued try-on request from the uploaded asset.</p>
          <div class="hero-panel">
            <div class="section-title">Upload zone</div>
            <p>Drag a photo or choose from device library. Image is linked to upload record before request creation.</p>
          </div>
          <div class="pill-row">
            <span class="pill accent">Real upload pipeline</span>
            <span class="pill neutral">Mock provider still supported</span>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/tryon-result">Upload and queue try-on</button>
            <button class="button secondary" data-route="/discover">Back to discover</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "tryon-result",
    group: "commerce",
    tag: "Commerce",
    route: "/tryon-result",
    title: "Try-On Result",
    subtitle: "Result review surface with fit, confidence, issues, alternatives, and commerce handoff.",
    focus: "Review information density and whether confidence, issues, and next actions are clear enough for decision-making.",
    primaryCta: "Compare buy options",
    nextRoutes: ["/recommendations", "/shops", "/tryon-upload"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Try-On Review</div>
          <h3>Commuter Jacket</h3>
          <p>Review the generated look, fit confidence, open issues, next alternatives, and retail follow-through before you buy.</p>
          <div class="pill-row">
            <span class="pill success">Completed</span>
            <span class="pill neutral">mock</span>
            <span class="pill accent">88% confidence</span>
          </div>
          <div class="hero-panel">
            <div class="section-title">Look preview</div>
            <p>Mock try-on generated successfully with a balanced drape estimate.</p>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Fit Review</div>
          <h3>Fit and confidence</h3>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Confidence</div>
              <div class="metric-value">88%</div>
              <div class="metric-copy">Provider-reported confidence</div>
            </div>
            <div class="metric">
              <div class="metric-label">Status</div>
              <div class="metric-value">Completed</div>
              <div class="metric-copy">Try-on completed</div>
            </div>
          </div>
          <div class="info-row"><strong>Product</strong><p>Commuter Jacket</p></div>
          <div class="info-row"><strong>Variant</strong><p>M</p></div>
          <div class="info-row"><strong>Source image</strong><p>uploads/demo/source-image.jpg</p></div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Issues</div>
          <h3>What to watch</h3>
          <div class="issue-row"><p>This run may still reflect mock provider behavior rather than a production rendering pipeline.</p></div>
          <div class="cta-row">
            <button class="button secondary" data-route="/recommendations">See alternatives</button>
            <button class="button ghost" data-route="/tryon-upload">Upload another photo</button>
            <button class="button primary" data-route="/shops">Compare buy options</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "recommendations",
    group: "commerce",
    tag: "Commerce",
    route: "/recommendations",
    title: "Recommendations",
    subtitle: "Shortlist of fit-ranked products with filters and commerce actions.",
    focus: "Review product-card depth, filter readability, and how well the shortlist supports comparison and try-on loops.",
    primaryCta: "Compare shops",
    nextRoutes: ["/shops", "/tryon-upload", "/saved-looks"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Recommendations</div>
          <h3>What fits your profile best</h3>
          <p>These picks are already ranked by the recommendation engine and shaped into a shopping-ready shortlist.</p>
          <div class="pill-row">
            <span class="pill success">Top scored</span>
            <span class="pill neutral">6 ranked pieces</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Top score</div>
              <div class="metric-value">92</div>
            </div>
            <div class="metric">
              <div class="metric-label">Best pick</div>
              <div class="metric-value">Northline</div>
            </div>
          </div>
          <div class="toggle-bar">
            <div class="toggle-pill active">All</div>
            <div class="toggle-pill">High score</div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Curated Cards</div>
          <h3>Recommendation shortlist</h3>
          <div class="feed-card">
            <strong>Commuter Jacket</strong>
            <p>Score 92. Routed here through fit-aware ranking with strong outerwear match.</p>
          </div>
          <div class="feed-card">
            <strong>Wool Blend Blazer</strong>
            <p>Interview-ready styling with better confidence for structured looks.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Compare shops</button>
            <button class="button secondary" data-route="/tryon-upload">Try on now</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "shops",
    group: "commerce",
    tag: "Commerce",
    route: "/shops",
    title: "Shops",
    subtitle: "Retail comparison surface for actual offers and regional context.",
    focus: "Check whether pricing, location context, and partner differentiation are clear enough for purchase decisions.",
    primaryCta: "Go to saved looks",
    nextRoutes: ["/saved-looks", "/coupons"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Retail Comparison</div>
          <h3>Buy options across connected partners</h3>
          <p>Use this layer to translate your recommendation shortlist into actual availability, region context, and offer depth.</p>
          <div class="pill-row">
            <span class="pill accent">3 shops</span>
            <span class="pill neutral">9 total offers</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Regions</div>
              <div class="metric-value">3</div>
            </div>
            <div class="metric">
              <div class="metric-label">Offers</div>
              <div class="metric-value">9</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Partner Cards</div>
          <h3>Shop comparison</h3>
          <div class="shop-card">
            <strong>City Threads</strong>
            <p>US region • 3 offers • from $84</p>
          </div>
          <div class="shop-card">
            <strong>Mode Collective</strong>
            <p>EU region • 3 offers • from $89</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/saved-looks">Go to saved looks</button>
            <button class="button secondary" data-route="/coupons">See coupons</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "saved-looks",
    group: "commerce",
    tag: "Commerce",
    route: "/saved-looks",
    title: "Saved Looks",
    subtitle: "Reusable shortlist for outfit ideas between discovery and buying.",
    focus: "Review grid/list behavior, empty-state readiness, and whether actions feel reusable rather than dead-end.",
    primaryCta: "Compare offers",
    nextRoutes: ["/shops", "/discover", "/rewards"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Saved",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Saved Looks</div>
          <h3>Your reusable outfit shortlist</h3>
          <p>Saved looks capture the bridge between inspiration, try-on confidence, and buy-ready comparison.</p>
          <div class="pill-row">
            <span class="pill success">1 look saved</span>
            <span class="pill neutral">Private shortlist</span>
          </div>
          <div class="toggle-bar">
            <div class="toggle-pill active">Grid</div>
            <div class="toggle-pill">List</div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Collection</div>
          <h3>Grid view</h3>
          <div class="mini-grid">
            <div class="look-card">
              <div class="art-board"></div>
              <strong>Commute Layers</strong>
              <p>Balanced smart-casual stack for weekday rotation.</p>
            </div>
            <div class="look-card">
              <div class="art-board"></div>
              <strong>Interview Ready</strong>
              <p>Structured blazer, trouser, and polished shoe shortlist.</p>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Compare offers</button>
            <button class="button secondary" data-route="/discover">Find similar</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "rewards",
    group: "growth",
    tag: "Growth",
    route: "/rewards",
    title: "Rewards Wallet",
    subtitle: "Student growth hub for points, campaigns, and unlockable benefits.",
    focus: "Review whether the reward system feels motivating and legible without looking like a generic loyalty dashboard.",
    primaryCta: "Browse unlockable coupons",
    nextRoutes: ["/coupons", "/referrals", "/challenges"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Student Rewards</div>
          <h3>Campus wallet and growth perks</h3>
          <p>Points accumulate across try-ons, shares, referrals, profile completion, and challenge activity.</p>
          <div class="pill-row">
            <span class="pill success">Insider tier</span>
            <span class="pill neutral">5 transactions</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Balance</div>
              <div class="metric-value">320</div>
              <div class="metric-copy">Available points to unlock coupons</div>
            </div>
            <div class="metric">
              <div class="metric-label">Earned</div>
              <div class="metric-value">420</div>
              <div class="metric-copy">Total points earned so far</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Reward Triggers</div>
          <h3>How points are moving</h3>
          <div class="activity-card">
            <strong>First Try On</strong>
            <p>+120 pts. First try-on reward.</p>
          </div>
          <div class="activity-card">
            <strong>Challenge Participation</strong>
            <p>+100 pts. Completed campus challenge.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/coupons">Browse unlockable coupons</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "referrals",
    group: "growth",
    tag: "Growth",
    route: "/referrals",
    title: "Referrals",
    subtitle: "Invite and conversion layer for student growth.",
    focus: "Check if the referral code, invite prompt, and event history feel actionable without overcomplicating the screen.",
    primaryCta: "Log invite sent",
    nextRoutes: ["/rewards", "/challenges"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Referral Engine</div>
          <h3>Invite friends and earn campus points</h3>
          <p>The referral flow tracks code creation, sends, conversions, and the reward value attached to each event.</p>
          <div class="hero-panel">
            <div class="section-title">Your code</div>
            <h3 style="margin-top:10px;font-size:34px">FIT-CAMPUS21</h3>
            <p>Use this code for student invite campaigns, creator shares, and peer recommendations.</p>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Invites</div>
              <div class="metric-value">1</div>
            </div>
            <div class="metric">
              <div class="metric-label">Converted</div>
              <div class="metric-value">1</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/referrals">Log invite sent</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "coupons",
    group: "growth",
    tag: "Growth",
    route: "/coupons",
    title: "Coupons",
    subtitle: "Unlock and redeem promotional benefits through reward thresholds and campaign linkage.",
    focus: "Review whether thresholds, status, and reward cost are easy to scan at a glance.",
    primaryCta: "Unlock coupon",
    nextRoutes: ["/challenges", "/shops", "/rewards"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Coupon Wallet</div>
          <h3>Unlock offers with rewards</h3>
          <p>Coupons can unlock through points or thresholds and are tied back to student-focused campaigns.</p>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Points</div>
              <div class="metric-value">320</div>
              <div class="metric-copy">Available for unlocks</div>
            </div>
            <div class="metric">
              <div class="metric-label">Unlocked</div>
              <div class="metric-value">2</div>
              <div class="metric-copy">Coupons already in your wallet</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Offer Grid</div>
          <h3>Available coupons</h3>
          <div class="coupon-card">
            <strong>Budget Under 999</strong>
            <p>UNDER999 • threshold 200 • cost 100 pts • status UNLOCKED</p>
          </div>
          <div class="coupon-card">
            <strong>Interview Edit 10% Off</strong>
            <p>INTERVIEW10 • threshold 300 • cost 0 pts • status REDEEMED</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Redeem path</button>
            <button class="button secondary" data-route="/challenges">Go to challenges</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "challenges",
    group: "growth",
    tag: "Growth",
    route: "/challenges",
    title: "Challenges",
    subtitle: "Student challenge participation tied to campaigns and reward grants.",
    focus: "Check whether campaign participation feels like a natural extension of the product rather than a bolted-on gamification layer.",
    primaryCta: "Join challenge",
    nextRoutes: ["/rewards", "/coupons"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Campus Challenges</div>
          <h3>Earn points through campaign participation</h3>
          <p>Join themed student campaigns like campus casual, interview ready, fest looks, and budget edits.</p>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Live</div>
              <div class="metric-value">3</div>
            </div>
            <div class="metric">
              <div class="metric-label">Claimed</div>
              <div class="metric-value">1</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Challenge Feed</div>
          <h3>Student campaign lineup</h3>
          <div class="list-card">
            <strong>Campus Casual Week</strong>
            <p>OPEN / CLAIMED state with campaign-backed challenge and wallet impact.</p>
          </div>
          <div class="list-card">
            <strong>Fest Look Push</strong>
            <p>JOINED state with social-share angle and reward conversion.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/rewards">Claim reward path</button>
            <button class="button secondary" data-route="/coupons">See coupon tie-in</button>
          </div>
        </div>
      </div>
    `
  }
];

const groups = {
  core: document.getElementById("nav-core"),
  commerce: document.getElementById("nav-commerce"),
  growth: document.getElementById("nav-growth")
};

const phoneScreen = document.getElementById("phone-screen");
const phoneTabs = document.getElementById("phone-tabs");
const screenTitle = document.getElementById("screen-title");
const screenSubtitle = document.getElementById("screen-subtitle");
const screenRoute = document.getElementById("screen-route");
const screenTag = document.getElementById("screen-tag");
const reviewFocus = document.getElementById("review-focus");
const primaryCta = document.getElementById("primary-cta");
const nextRoutes = document.getElementById("next-routes");

function buildNav() {
  screens.forEach((screen) => {
    const button = document.createElement("button");
    button.className = "nav-link";
    button.dataset.screen = screen.id;
    button.innerHTML = `${screen.title}<small>${screen.route}</small>`;
    button.addEventListener("click", () => renderScreen(screen.id));
    groups[screen.group].appendChild(button);
  });
}

function renderTabs(screen) {
  phoneTabs.innerHTML = "";
  if (!screen.tabs?.length) {
    return;
  }

  screen.tabs.forEach((tab) => {
    const item = document.createElement("div");
    item.className = `tab-item${tab === screen.activeTab ? " active" : ""}`;
    item.innerHTML = `<div class="tab-dot"></div><span>${tab}</span>`;
    phoneTabs.appendChild(item);
  });
}

function renderScreen(id) {
  const screen = screens.find((item) => item.id === id) || screens[0];

  document.querySelectorAll(".nav-link").forEach((node) => {
    node.classList.toggle("active", node.dataset.screen === screen.id);
  });

  screenTitle.textContent = screen.title;
  screenSubtitle.textContent = screen.subtitle;
  screenRoute.textContent = screen.route;
  screenTag.textContent = screen.tag;
  reviewFocus.textContent = screen.focus;
  primaryCta.textContent = screen.primaryCta;
  nextRoutes.innerHTML = screen.nextRoutes
    .map((route) => `<span class="route-chip">${route}</span>`)
    .join("");

  phoneScreen.innerHTML = screen.render();
  renderTabs(screen);

  phoneScreen.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", () => renderByRoute(node.dataset.route));
  });

  window.location.hash = screen.id;
}

function renderByRoute(route) {
  const match = screens.find((screen) => screen.route === route);
  if (match) {
    renderScreen(match.id);
  }
}

buildNav();

const initial = window.location.hash.replace("#", "");
renderScreen(initial || "onboarding");
