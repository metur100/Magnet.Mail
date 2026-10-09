/**
 * Integration points for future monetisation. Nothing here talks to a real ad network or store:
 * the default providers report "not available", and progression never depends on them.
 *
 * To integrate later (for example AdMob / Google Play Billing via Capacitor plugins), implement
 * `AdProvider` and/or `PurchaseProvider` and pass them to `Monetization.configure()` at start-up.
 *
 * Products:
 *   remove-ads            one-time purchase → entitlements.removeAds
 *   parcel-<skin id>      cosmetic parcel pack → entitlements.parcelPacks
 *   mailbox-<skin id>     cosmetic mailbox pack → entitlements.mailboxPacks
 *   bonus-daily           a second daily delivery each day → entitlements.bonusDaily
 * Rewarded placements:
 *   rewarded-hint         optional extra hint (the game always offers a free hint as well)
 */

export type ProductId = 'remove-ads' | 'bonus-daily' | `parcel-${string}` | `mailbox-${string}`;

export interface AdProvider {
  isRewardedReady(placement: 'rewarded-hint'): boolean;
  /** Resolves true when the reward was earned. */
  showRewarded(placement: 'rewarded-hint'): Promise<boolean>;
}

export interface PurchaseProvider {
  purchase(product: ProductId): Promise<boolean>;
  restore(): Promise<ProductId[]>;
}

export interface Entitlements {
  removeAds: boolean;
  parcelPacks: string[];
  mailboxPacks: string[];
  bonusDaily: boolean;
}

const unavailableAds: AdProvider = {
  isRewardedReady: () => false,
  showRewarded: async () => false,
};

const unavailableStore: PurchaseProvider = {
  purchase: async () => false,
  restore: async () => [],
};

class MonetizationManager {
  private ads: AdProvider = unavailableAds;
  private store: PurchaseProvider = unavailableStore;

  configure(providers: { ads?: AdProvider; store?: PurchaseProvider }): void {
    if (providers.ads) this.ads = providers.ads;
    if (providers.store) this.store = providers.store;
  }

  rewardedHintAvailable(entitlements: Entitlements): boolean {
    return !entitlements.removeAds && this.ads.isRewardedReady('rewarded-hint');
  }

  showRewardedHint(): Promise<boolean> {
    return this.ads.showRewarded('rewarded-hint');
  }

  async purchase(product: ProductId, entitlements: Entitlements): Promise<Entitlements> {
    const ok = await this.store.purchase(product);
    return ok ? applyProduct(entitlements, product) : entitlements;
  }

  async restore(entitlements: Entitlements): Promise<Entitlements> {
    const products = await this.store.restore();
    return products.reduce(applyProduct, entitlements);
  }
}

export function applyProduct(entitlements: Entitlements, product: ProductId): Entitlements {
  if (product === 'remove-ads') return { ...entitlements, removeAds: true };
  if (product === 'bonus-daily') return { ...entitlements, bonusDaily: true };
  if (product.startsWith('parcel-')) {
    const id = product.slice('parcel-'.length);
    return entitlements.parcelPacks.includes(id) ? entitlements : { ...entitlements, parcelPacks: [...entitlements.parcelPacks, id] };
  }
  const id = product.slice('mailbox-'.length);
  return entitlements.mailboxPacks.includes(id) ? entitlements : { ...entitlements, mailboxPacks: [...entitlements.mailboxPacks, id] };
}

export const Monetization = new MonetizationManager();
