const screens = [
  {
    id: "onboarding",
    group: "core",
    tag: "Core",
    route: "/onboarding",
    title: "Onboarding",
    subtitle: "First-run entry that explains what the app does before asking for profile inputs.",
    focus: "Check whether the value prop is legible fast and whether the first CTA clearly moves users toward setup.",
    primaryCta: "Start setup",
    nextRoutes: ["/auth", "/profile", "/discover"],
    tabs: [],
    render: () => `
      <div class="screen-stack">
        <div class="screen-card hero-surface">
          <div class="eyebrow">Premium Fashion Tech</div>
          <h3>Find your best fit before you shop</h3>
          <p>Measurements, AI try-on, and price comparison stay connected so users do not have to guess their next step.</p>
          <div class="pill-row">
            <span class="pill accent">Profile + fit + try-on + shops</span>
            <span class="pill success">4 minute setup</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Outcome</div>
              <div class="metric-value">Size clarity</div>
              <div class="metric-copy">Explain match scores instead of dropping users into raw catalog cards.</div>
            </div>
            <div class="metric">
              <div class="metric-label">Trust</div>
              <div class="metric-value">Visible status</div>
              <div class="metric-copy">Every loading, error, and success step gets explicit feedback.</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/auth">Start setup</button>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">What Changed</div>
          <h3>User-testing fixes now embedded</h3>
          <div class="feature-row">
            <strong>One obvious action per screen</strong>
            <p>Primary actions are singular and the route notes explain why that action is next.</p>
          </div>
          <div class="feature-row">
            <strong>Progress and recovery states</strong>
            <p>Try-on shows processing time, auth shows recovery help, and empty states point to the next meaningful action.</p>
          </div>
          <div class="feature-row">
            <strong>Profile becomes the real hub</strong>
            <p>Identity, measurements, style profile, and logout are visible without hiding them in a menu.</p>
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
    subtitle: "Sign-in screen with a clear failure state and recovery guidance.",
    focus: "Review whether the error state reduces confusion and whether the single primary CTA stays obvious.",
    primaryCta: "Try again",
    nextRoutes: ["/profile", "/onboarding"],
    tabs: [],
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Member Access</div>
          <h3>Return to your fit profile</h3>
          <p>Measurements, recommendations, and saved looks stay synced once the user gets back into the app.</p>
          <div class="pill-row">
            <span class="pill accent">Sign in</span>
            <span class="pill neutral">Password reset available</span>
          </div>
          <div class="toggle-bar">
            <div class="toggle-pill active">Sign in</div>
            <div class="toggle-pill">Create account</div>
          </div>
          <div class="input">Email</div>
          <div class="input">Password</div>
          <div class="status-card error">
            <div class="section-title">Could not sign you in</div>
            <p>Check your password or reset it. Your profile and saved looks are still safe.</p>
          </div>
          <div class="helper-list">
            <div class="helper-row"><strong>Why this is better</strong><p>Replaces a generic internal server error with guidance the user can act on immediately.</p></div>
            <div class="helper-row"><strong>Recovery</strong><p>Reset password, retry sign in, or return to onboarding for first-time setup.</p></div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/profile">Try again</button>
          </div>
          <div class="text-link-row">
            <button class="text-link">Forgot password?</button>
            <button class="text-link" data-route="/onboarding">Back to setup</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "profile",
    group: "core",
    tag: "Core",
    route: "/profile",
    title: "Profile Hub",
    subtitle: "Visible identity, measurement shortcuts, style preferences, and logout in one place.",
    focus: "Check whether the account surface behaves like a navigation hub rather than a dead-end details screen.",
    primaryCta: "Edit measurements",
    nextRoutes: ["/measurements", "/discover", "/saved-looks"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Profile",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card hero-surface">
          <div class="profile-summary">
            <div class="avatar-badge">DU</div>
            <div>
              <div class="eyebrow">Profile Hub</div>
              <h3>Demo User</h3>
              <p>Identity, fit inputs, upload assets, and account actions stay visible from the top of the profile route.</p>
            </div>
            <button class="button secondary compact">Logout</button>
          </div>
          <div class="pill-row">
            <span class="pill success">Remote photo synced</span>
            <span class="pill neutral">Regular fit</span>
            <span class="pill accent">Premium budget</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Measurements</div>
              <div class="metric-value">5/6</div>
              <div class="metric-copy">Enough data for fit guidance, with confidence reduced where missing.</div>
            </div>
            <div class="metric">
              <div class="metric-label">Saved Looks</div>
              <div class="metric-value">0</div>
              <div class="metric-copy">Empty state routes the user back into generation instead of stopping here.</div>
            </div>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Your Style Profile</div>
          <h3>Clean language instead of jargon</h3>
          <div class="pill-row">
            <span class="pill neutral">Street minimal</span>
            <span class="pill neutral">Black + sand</span>
            <span class="pill neutral">Campus formal</span>
          </div>
          <div class="nav-tile-list">
            <button class="nav-tile" data-route="/measurements"><strong>Edit measurements</strong><span>Update chest, waist, hips, and inseam.</span></button>
            <button class="nav-tile" data-route="/discover"><strong>Browse fit-aware picks</strong><span>See why sizes and colors match your current profile.</span></button>
            <button class="nav-tile" data-route="/saved-looks"><strong>Open saved looks</strong><span>Review wardrobe items and any empty-state guidance.</span></button>
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
    subtitle: "Fit data input screen with confidence context and a clear save path.",
    focus: "Review whether the coverage and confidence framing explain why these inputs matter before users continue.",
    primaryCta: "Save measurements",
    nextRoutes: ["/discover", "/profile"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Profile",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Fit Calibration</div>
          <h3>Body measurements</h3>
          <p>These values drive recommended size, fit label, confidence score, issue flags, and explanation text.</p>
          <div class="pill-row">
            <span class="pill success">Coverage 5/6</span>
            <span class="pill warning">Confidence reduced until sleeve is added</span>
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
          <div class="helper-list">
            <div class="helper-row"><strong>Cross-screen behavior</strong><p>Saving here should update profile, discover, recommendations, and try-on without stale data on back navigation.</p></div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/discover">Save measurements</button>
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
    subtitle: "Catalog entry with one primary action and clearer fit reasons on product cards.",
    focus: "Check whether the match explanation, price format, and CTA hierarchy reduce browsing confusion.",
    primaryCta: "Try this look",
    nextRoutes: ["/tryon-upload", "/recommendations", "/shops"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card hero-surface">
          <div class="eyebrow">Discover</div>
          <h3>Fit-aware picks for your next look</h3>
          <p>Each card now explains why the score exists instead of showing a raw percentage with no context.</p>
          <div class="pill-row">
            <span class="pill accent">INR pricing only</span>
            <span class="pill success">Primary CTA reduced to one</span>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Featured Match</div>
          <h3>Commuter Jacket</h3>
          <div class="score-banner">
            <strong>98% size match</strong>
            <p>Based on your 168 cm height, regular fit preference, and premium budget range.</p>
          </div>
          <div class="feed-card">
            <strong>Why it ranks well</strong>
            <p>Recommended size M. Regular drape. No major chest or sleeve flags from the current chart.</p>
          </div>
          <div class="feed-card">
            <strong>Price</strong>
            <p>₹2,499 on connected partners. Currency stays consistent across the prototype.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/tryon-upload">Try this look</button>
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
    subtitle: "Entry screen with camera fallback, profile photo reuse, and link import.",
    focus: "Review whether the upload choices cover the common failure cases from user testing without overloading the layout.",
    primaryCta: "Generate try-on",
    nextRoutes: ["/processing", "/discover"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Try-On Input</div>
          <h3>Choose how you want to start</h3>
          <p>Camera access can fail, so the route offers multiple paths before users get blocked.</p>
          <div class="toggle-bar">
            <div class="toggle-pill active">Photo</div>
            <div class="toggle-pill">From link</div>
          </div>
          <div class="upload-grid">
            <div class="upload-card">
              <strong>Use camera</strong>
              <p>Take a new photo if permissions are available.</p>
            </div>
            <div class="upload-card">
              <strong>Upload photo</strong>
              <p>Pick from library and keep the local preview until the remote upload finishes.</p>
            </div>
            <div class="upload-card">
              <strong>Use profile photo</strong>
              <p>Reuse the synced portrait already saved to the account.</p>
            </div>
          </div>
          <div class="status-card neutral">
            <div class="section-title">From Link</div>
            <p>Paste a Myntra or other retailer URL to fetch the product instead of searching again manually.</p>
          </div>
          <div class="input">Paste retailer link</div>
          <div class="helper-list">
            <div class="helper-row"><strong>Why this is better</strong><p>Solves camera failure, hidden import flow, and stale local-only image handling in one route.</p></div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/processing">Generate try-on</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "processing",
    group: "core",
    tag: "Core",
    route: "/processing",
    title: "Processing",
    subtitle: "Visible in-between state for try-on generation with time expectation and recovery path.",
    focus: "Check whether loading is explicit enough and whether users know what to do if generation fails.",
    primaryCta: "View result",
    nextRoutes: ["/tryon-result", "/discover"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card hero-panel processing-panel">
          <div class="section-title">Generating your look</div>
          <h3>10-15 seconds</h3>
          <p>Your photo, garment, and fit profile are being blended into a try-on preview with saved progress.</p>
          <div class="loader-line"><span></span></div>
          <div class="pill-row">
            <span class="pill accent">Upload saved</span>
            <span class="pill neutral">You can safely leave and return</span>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">If Something Fails</div>
          <h3>Recovery is visible</h3>
          <div class="status-card warning">
            <div class="section-title">Generation taking longer than expected</div>
            <p>Keep waiting, retry with the same uploaded image, or return to discover without losing the upload record.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/tryon-result">View result</button>
          </div>
          <div class="text-link-row">
            <button class="text-link" data-route="/tryon-upload">Retry upload</button>
            <button class="text-link" data-route="/discover">Back to feed</button>
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
    subtitle: "Result route with clear fit guidance, explanation text, and a friendlier error fallback.",
    focus: "Review whether success and failure states preserve trust and whether the next buy action is obvious.",
    primaryCta: "Compare buy options",
    nextRoutes: ["/shops", "/recommendations", "/tryon-upload"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Try-On Review</div>
          <h3>Commuter Jacket</h3>
          <p>The result route now explains the fit signal instead of just reporting a completed status.</p>
          <div class="pill-row">
            <span class="pill success">Result ready</span>
            <span class="pill accent">Recommended size M</span>
            <span class="pill neutral">Regular fit</span>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Confidence</div>
              <div class="metric-value">92%</div>
              <div class="metric-copy">Lowered automatically if measurement or chart coverage is weak.</div>
            </div>
            <div class="metric">
              <div class="metric-label">Issue Flags</div>
              <div class="metric-value">1</div>
              <div class="metric-copy">Sleeve slightly long. Chest and waist remain clear.</div>
            </div>
          </div>
          <div class="helper-list">
            <div class="helper-row"><strong>Explanation</strong><p>Best fit for your measurements, matches your style profile, and stays inside your premium budget target.</p></div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Compare buy options</button>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Friendly Failure State</div>
          <h3>Fallback when generation breaks</h3>
          <div class="status-card error">
            <div class="section-title">We could not finish this try-on</div>
            <p>Your uploaded photo is still saved. Retry the same request or go back to feed without starting over.</p>
          </div>
          <div class="text-link-row">
            <button class="text-link" data-route="/tryon-upload">Retry</button>
            <button class="text-link" data-route="/discover">Back to feed</button>
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
    subtitle: "Shortlist that spells out fit, budget, color, and occasion reasons.",
    focus: "Check whether the ranking reasons make the recommendation engine feel credible and action-oriented.",
    primaryCta: "Compare shops",
    nextRoutes: ["/shops", "/saved-looks", "/tryon-upload"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Recommendations</div>
          <h3>What fits your profile best</h3>
          <p>Cards now surface the reasons directly: fit, style, color, budget, and occasion.</p>
          <div class="pill-row">
            <span class="pill success">Best fit</span>
            <span class="pill neutral">Interview ready</span>
            <span class="pill accent">Within budget</span>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Top Pick</div>
          <h3>Wool Blend Blazer</h3>
          <div class="feed-card">
            <strong>Why it ranks</strong>
            <p>Best fit for your measurements, works with your black-and-sand palette, and matches formal campus use.</p>
          </div>
          <div class="feed-card">
            <strong>Confidence</strong>
            <p>Recommended size M. Regular fit. 90% confidence because all torso measurements are available.</p>
          </div>
          <div class="feed-card">
            <strong>Price</strong>
            <p>₹3,299 across connected shops.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Compare shops</button>
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
    subtitle: "Commerce comparison with INR pricing, retailer badges, and outbound handoff language.",
    focus: "Review whether the commerce route answers price, fit, and retailer questions before the user leaves the app.",
    primaryCta: "Open best offer",
    nextRoutes: ["/saved-looks", "/coupons", "/recommendations"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Discover",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Retail Comparison</div>
          <h3>Compare offers before retailer handoff</h3>
          <p>The route is now region-consistent and highlights why an offer is recommended, not just who sells it.</p>
          <div class="pill-row">
            <span class="pill accent">INR only</span>
            <span class="pill success">Best price + best fit badges</span>
          </div>
        </div>

        <div class="screen-card">
          <div class="eyebrow">Offers</div>
          <h3>Commuter Jacket</h3>
          <div class="shop-card">
            <strong>Myntra</strong>
            <p>₹2,399 • Best price • Recommended size M in stock.</p>
          </div>
          <div class="shop-card">
            <strong>Ajio</strong>
            <p>₹2,549 • Best fit badge • Better return window.</p>
          </div>
          <div class="shop-card">
            <strong>Nykaa Fashion</strong>
            <p>₹2,699 • Cheaper alternative accessories bundled below.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/saved-looks">Open best offer</button>
          </div>
          <div class="text-link-row">
            <button class="text-link" data-route="/coupons">Apply coupon</button>
            <button class="text-link" data-route="/recommendations">See alternatives</button>
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
    subtitle: "Wardrobe route with an empty state that pushes users back into creation.",
    focus: "Review whether the empty state feels motivating and whether saved looks stay connected to commerce and generation.",
    primaryCta: "Generate first look",
    nextRoutes: ["/tryon-upload", "/shops", "/profile"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Saved",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Saved Looks</div>
          <h3>Your wardrobe is empty</h3>
          <p>Instead of a dead-end blank grid, the route explains what users gain by generating and saving a first look.</p>
          <div class="status-card neutral">
            <div class="section-title">Next best action</div>
            <p>Generate your first try-on, then save the result here for future shopping and outfit planning.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/tryon-upload">Generate first look</button>
          </div>
          <div class="text-link-row">
            <button class="text-link" data-route="/profile">Back to profile</button>
            <button class="text-link" data-route="/shops">Browse buy options</button>
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
    subtitle: "Student rewards route kept practical and tied to core app behavior.",
    focus: "Check whether growth feels connected to product use instead of looking bolted on.",
    primaryCta: "Browse coupons",
    nextRoutes: ["/coupons", "/referrals", "/challenges"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Student Rewards</div>
          <h3>Campus wallet and growth perks</h3>
          <p>Rewards continue to be triggered by profile completion, try-ons, and campaign participation.</p>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Balance</div>
              <div class="metric-value">320</div>
              <div class="metric-copy">Available points to unlock student-focused benefits.</div>
            </div>
            <div class="metric">
              <div class="metric-label">Tier</div>
              <div class="metric-value">Insider</div>
              <div class="metric-copy">Higher status after try-on and challenge activity.</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/coupons">Browse coupons</button>
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
    subtitle: "Invite surface for peer growth and points.",
    focus: "Check whether the code and conversion value are obvious enough without adding clutter.",
    primaryCta: "Share code",
    nextRoutes: ["/rewards", "/challenges"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Referral Engine</div>
          <h3>Invite friends and earn campus points</h3>
          <div class="hero-panel">
            <div class="section-title">Your code</div>
            <h3 style="margin-top:10px;font-size:34px">FIT-CAMPUS21</h3>
            <p>One tap to share the code, then track which invites converted into signups.</p>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Invites</div>
              <div class="metric-value">12</div>
            </div>
            <div class="metric">
              <div class="metric-label">Converted</div>
              <div class="metric-value">4</div>
            </div>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/rewards">Share code</button>
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
    subtitle: "Offer wallet linked back to saved points and commerce routes.",
    focus: "Review whether unlock cost and current status are easy to scan.",
    primaryCta: "Redeem best coupon",
    nextRoutes: ["/shops", "/challenges", "/rewards"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Coupon Wallet</div>
          <h3>Unlock offers with rewards</h3>
          <div class="coupon-card">
            <strong>Budget Under 999</strong>
            <p>UNDER999 • unlock at 200 pts • cost 100 pts • status unlocked.</p>
          </div>
          <div class="coupon-card">
            <strong>Interview Edit 10% Off</strong>
            <p>INTERVIEW10 • threshold 300 • status ready to apply in shops.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/shops">Redeem best coupon</button>
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
    subtitle: "Campaign route tied to points and repeat engagement.",
    focus: "Check whether the challenge feed feels product-adjacent rather than generic gamification.",
    primaryCta: "Join challenge",
    nextRoutes: ["/rewards", "/coupons"],
    tabs: ["Profile", "Discover", "Saved", "Rewards"],
    activeTab: "Rewards",
    render: () => `
      <div class="screen-stack">
        <div class="screen-card">
          <div class="eyebrow">Campus Challenges</div>
          <h3>Earn points through themed participation</h3>
          <div class="list-card">
            <strong>Campus Casual Week</strong>
            <p>Generate a look, save it, and share it to claim reward points.</p>
          </div>
          <div class="list-card">
            <strong>Interview Ready Push</strong>
            <p>Try on a formal edit and unlock coupon eligibility.</p>
          </div>
          <div class="cta-row">
            <button class="button primary" data-route="/rewards">Join challenge</button>
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

function bindRouteActions(root) {
  root.querySelectorAll("[data-route]").forEach((node) => {
    node.addEventListener("click", () => renderByRoute(node.dataset.route));
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
  bindRouteActions(phoneScreen);

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
