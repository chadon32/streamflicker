/**
 * What the privacy page says about our own measurement. The sentence depends on the deployment: outbound
 * "Where to watch" clicks are reported only when VITE_AFFILIATE_CLICK_ENDPOINT is set, so the policy must
 * not claim "no analytics" in that case.
 */
export function getMeasurementStatement(clickEndpoint: string | undefined): string {
  if (clickEndpoint?.trim()) {
    return "When you open a Where to watch link, we record which provider and title you chose and when, so we can see which links are used. The report carries no name or account details. We don't run any other analytics or advertising trackers of our own.";
  }
  return "We don't run our own analytics or advertising trackers.";
}
