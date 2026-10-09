import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { drawParcel } from '../entities/Parcel';
import { GameContext } from '../GameContext';
import { WORLDS } from '../levels/LevelData';
import { describeUnlock, MAILBOX_SKINS, PARCEL_SKINS, type MailboxSkin, type ParcelSkin, type Rarity } from '../progression/Cosmetics';
import { Button } from '../ui/Button';
import type { Focusable } from '../ui/FocusManager';
import { drawIcon } from '../ui/Icons';
import { addText } from '../ui/Typography';
import { COLORS } from '../utils/Constants';
import { Haptics } from '../utils/Haptics';
import { announce, BaseScene } from './BaseScene';

type Tab = 'parcels' | 'mailboxes';
const PER_PAGE = 6;
const RARITY_COLOR: Record<Rarity, number> = { Common: 0x8a96a8, Rare: 0x2f7ff0, Epic: 0x8e5cf7, Legendary: 0xf2a516 };

function drawMiniMailbox(g: Phaser.GameObjects.Graphics, skin: MailboxSkin, x: number, y: number): void {
  g.fillStyle(skin.trim, 1);
  g.fillRect(x - 6, y + 22, 12, 30);
  g.fillStyle(skin.body, 1);
  g.fillRoundedRect(x - 48, y - 30, 96, 58, skin.style === 'locker' || skin.style === 'industrial' ? 6 : 24);
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(x - 36, y - 20, 72, 16, 6);
  g.lineStyle(3, skin.trim, 1);
  g.strokeRoundedRect(x - 48, y - 30, 96, 58, skin.style === 'locker' || skin.style === 'industrial' ? 6 : 24);
  if (skin.style === 'port') {
    g.lineStyle(3, skin.flag, 1);
    g.strokeCircle(x, y + 2, 14);
  }
  g.fillStyle(0x6b7280, 1);
  g.fillRect(x + 52, y - 40, 4, 40);
  g.fillStyle(skin.flag, 1);
  g.fillRect(x + 56, y - 40, 20, 12);
}

/** A collection card: preview, name, category, rarity, unlock condition and selection state. */
class ItemCard extends Phaser.GameObjects.Container implements Focusable {
  private readonly ring: Phaser.GameObjects.Graphics;
  readonly accessibleName: string;

  constructor(
    scene: CollectionScene,
    x: number,
    y: number,
    private readonly cardW: number,
    private readonly cardH: number,
    item: ParcelSkin | MailboxSkin,
    kind: Tab,
    readonly unlocked: boolean,
    selected: boolean,
    private readonly onPick: () => void,
  ) {
    super(scene, x, y);
    const w = cardW;
    const h = cardH;
    this.accessibleName = item.name;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.ink, 0.14);
    g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 24);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
    if (selected) {
      g.lineStyle(5, COLORS.good, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 24);
    }
    g.fillStyle(0xeef3fa, 1);
    g.fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h * 0.46, 18);
    this.add(g);

    const preview = scene.add.graphics();
    const py = -h / 2 + 10 + h * 0.23;
    if (kind === 'parcels') {
      drawParcel(preview, 'box', item as ParcelSkin, 32);
      preview.setPosition(0, py);
      if (unlocked && !GameContext.reducedMotion) scene.tweens.add({ targets: preview, angle: 8, y: py - 6, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else {
      drawMiniMailbox(preview, item as MailboxSkin, 0, py);
    }
    this.add(preview);
    if (!unlocked) {
      const lock = scene.add.graphics();
      lock.fillStyle(COLORS.ink, 0.5);
      lock.fillRoundedRect(-w / 2 + 10, -h / 2 + 10, w - 20, h * 0.46, 18);
      drawIcon(lock, 'lock', 0, py, 40, 0xffffff);
      this.add(lock);
    }

    let ty = -h / 2 + h * 0.46 + 32;
    this.add(addText(scene, -w / 2 + 18, ty, item.name, { size: 22, weight: '700', origin: [0, 0.5] }));
    ty += 28;
    const badge = scene.add.graphics();
    badge.fillStyle(RARITY_COLOR[item.rarity], 1);
    badge.fillRoundedRect(-w / 2 + 18, ty - 12, 92, 24, 12);
    this.add(badge);
    this.add(addText(scene, -w / 2 + 64, ty, item.rarity, { size: 16, weight: '700', color: '#ffffff' }));
    this.add(addText(scene, -w / 2 + 120, ty, item.category, { size: 17, weight: '600', color: COLORS.muted, origin: [0, 0.5] }));
    ty += 30;
    const status = selected ? '✔ Selected' : unlocked ? 'Tap to select' : describeUnlock(item.unlock, WORLDS.map((wd) => wd.name));
    this.add(
      addText(scene, -w / 2 + 18, ty, status, {
        size: 17,
        weight: selected ? '700' : '600',
        color: selected ? COLORS.goodText : COLORS.muted,
        origin: [0, 0.5],
        wrapWidth: w - 30,
      }),
    );

    this.ring = scene.add.graphics();
    this.add(this.ring);
    this.setSize(w, h);
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    if (this.input) this.input.cursor = 'pointer';
    this.on('pointerup', () => this.activate());
    scene.add.existing(this);
    scene.focus.add(this);
  }

  get focusable(): boolean {
    return true;
  }

  setFocused(focused: boolean): void {
    this.ring.clear();
    if (!focused) return;
    this.ring.lineStyle(6, COLORS.ink, 0.9);
    this.ring.strokeRoundedRect(-this.cardW / 2 - 7, -this.cardH / 2 - 7, this.cardW + 14, this.cardH + 14, 30);
  }

  activate(): void {
    AudioManager.unlock();
    Haptics.play('tap');
    if (!this.unlocked) {
      AudioManager.toggle(false);
      announce(`${this.accessibleName} is locked.`);
      return;
    }
    AudioManager.button();
    this.onPick();
  }
}

/** Parcel and mailbox collections (cosmetic). */
export class CollectionScene extends BaseScene {
  private tab: Tab = 'parcels';
  private page = 0;
  private pageObjects: Phaser.GameObjects.GameObject[] = [];
  private pageLabel!: Phaser.GameObjects.Text;
  private countLabel!: Phaser.GameObjects.Text;
  private tabButtons: Button[] = [];

  constructor() {
    super('Collection');
  }

  init(data: { tab?: Tab; page?: number }): void {
    this.tab = data?.tab ?? 'parcels';
    this.page = data?.page ?? 0;
  }

  create(): void {
    this.setupScene('Collection');
    const g = this.add.graphics();
    g.fillGradientStyle(0xf3ecff, 0xf3ecff, 0xe3f3fb, 0xe3f3fb, 1);
    g.fillRect(0, 0, this.W, this.H);
    const top = this.addHeader('Collection', () => this.go('Menu'));
    this.tabButtons = [
      new Button(this, { x: this.W / 2 - 150, y: top + 20, width: 280, height: 74, label: 'Parcels', icon: 'parcel', variant: 'secondary', fontSize: 26, onClick: () => this.switchTab('parcels'), focus: this.focus }),
      new Button(this, { x: this.W / 2 + 150, y: top + 20, width: 280, height: 74, label: 'Mailboxes', icon: 'mailbox', variant: 'secondary', fontSize: 26, onClick: () => this.switchTab('mailboxes'), focus: this.focus }),
    ];
    this.countLabel = addText(this, this.W / 2, top + 84, '', { size: 22, weight: '600', color: COLORS.muted });
    const by = this.H - this.safeBottom - 60;
    new Button(this, { x: 110, y: by, width: 170, height: 84, icon: 'back', label: 'Prev', variant: 'secondary', fontSize: 26, onClick: () => this.showPage(this.page - 1), focus: this.focus });
    new Button(this, { x: this.W - 110, y: by, width: 170, height: 84, icon: 'next', label: 'Next', variant: 'secondary', fontSize: 26, onClick: () => this.showPage(this.page + 1), focus: this.focus });
    this.pageLabel = addText(this, this.W / 2, by, '', { size: 26, weight: '600' });
    this.events.once('shutdown', () => this.clearPage());
    this.switchTab(this.tab);
  }

  private get items(): (ParcelSkin | MailboxSkin)[] {
    return this.tab === 'parcels' ? PARCEL_SKINS : MAILBOX_SKINS;
  }

  private switchTab(tab: Tab): void {
    if (tab !== this.tab) this.page = 0;
    this.tab = tab;
    this.tabButtons[0].setVariant(tab === 'parcels' ? 'primary' : 'secondary');
    this.tabButtons[1].setVariant(tab === 'mailboxes' ? 'primary' : 'secondary');
    this.showPage(this.page);
  }

  private clearPage(): void {
    for (const o of this.pageObjects) o.destroy();
    this.pageObjects = [];
  }

  private showPage(page: number): void {
    const pages = Math.ceil(this.items.length / PER_PAGE);
    this.page = Phaser.Math.Wrap(page, 0, pages);
    this.clearPage();
    const save = GameContext.save;
    const owned = this.tab === 'parcels' ? save.unlockedParcels : save.unlockedMailboxes;
    const selected = this.tab === 'parcels' ? save.selectedParcel : save.selectedMailbox;
    this.countLabel.setText(`${owned.length} / ${this.items.length} unlocked`);
    this.pageLabel.setText(`Page ${this.page + 1} / ${pages}`);
    const top = this.safeTop + 280;
    const bottom = this.H - this.safeBottom - 120;
    const gap = 18;
    const cardW = (this.W - 48 - gap) / 2;
    const cardH = Math.min(300, (bottom - top - gap * 2) / 3);
    this.items.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach((item, i) => {
      const x = 24 + cardW / 2 + (i % 2) * (cardW + gap);
      const y = top + cardH / 2 + Math.floor(i / 2) * (cardH + gap);
      const card = new ItemCard(this, x, y, cardW, cardH, item, this.tab, owned.includes(item.id), selected === item.id, () => this.select(item.id));
      this.pageObjects.push(card);
    });
    announce(`${this.tab === 'parcels' ? 'Parcel' : 'Mailbox'} collection, page ${this.page + 1}`);
  }

  private select(id: string): void {
    const save = GameContext.save;
    GameContext.update(this.tab === 'parcels' ? { ...save, selectedParcel: id } : { ...save, selectedMailbox: id });
    announce('Selected');
    this.showPage(this.page);
  }
}
