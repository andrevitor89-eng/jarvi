/**
 * Sidebar Component - Jarvi Web
 *
 * Global application sidebar. Handles:
 *  - User profile header (avatar, name, plan label, settings/collapse toggle)
 *  - Optional Pro CTA for trialing / free users
 *  - Task navigation items (Todas as tarefas, Hoje, Esta semana, Futuro, Sem data, Vencidas)
 *  - Collapsible "Categorias" group with hover add-button
 *  - Collapsible "Filtros" group (custom lists)
 *  - Expanded (320 px) / Collapsed (56 px) states, toggled internally
 *
 * Figma: https://www.figma.com/design/TM2wS5y3DkyW9bvfP7xzHK/JarviDS-App?node-id=40001333-125371
 */

import { useState, useRef, useEffect, type RefObject, type MutableRefObject } from 'react';
import {
  Checks,
  CalendarDots,
  Tray,
  HourglassLow,
  Hash,
  FunnelSimple,
  SidebarSimple,
  Bug,
  Lightbulb,
  Repeat,
} from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { Avatar } from '../../ui/Avatar/Avatar';
import { Button } from '../../ui/Button/Button';
import { ListItem } from '../../ui/ListItem/ListItem';
import { Dialog, Dropdown, Tooltip, Divider, BottomSheet, WhatsNewCard } from '../../ui';
import {
  SettingsDialog,
  SettingsPageContent,
  SIDEBAR_ITEMS,
  type SettingsPage,
  type SettingsProfileOverlay,
} from '../../features/account/SettingsDialog/SettingsDialog';
import { ChangePasswordDialog } from '../../features/account/SettingsDialog/ChangePasswordDialog';
import { DisconnectGoogleDialog } from '../../features/account/SettingsDialog/DisconnectGoogleDialog';
import { DeleteAccountDialog } from '../../features/account/SettingsDialog/DeleteAccountDialog';
import { useMobileSidebar } from '../MainLayout/MainLayout';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarUserMenu } from './SidebarUserMenu';
import { UpgradeButton } from '../../ui/UpgradeButton/UpgradeButton';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { useTheme } from '../../../contexts/ThemeContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { SignOut, Gear } from '@phosphor-icons/react';
import { FeedbackDialog } from '../../features/feedback/FeedbackDialog';
import type { FeedbackKind } from '../../../lib/posthogFeedback';
import { CreateListPopover } from '../../features/tasks/CreateListPopover/CreateListPopover';
import {
  APP_PARAM,
  CONTA_PARAM,
  FEEDBACK_PARAM,
  parseSettingsPage,
  tasksPathname,
} from '../../../lib/taskShellSearch';
import styles from './Sidebar.module.css';

// ── Re-exported task navigation constants ─────────────────────────────────────
// These are used by the Tasks page to set up scroll-spy and section anchors.

export type ListType =
  | 'all'
  | 'important'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'later'
  | 'noDate'
  | 'overdue'
  | 'recurring'
  | 'completed';

export type CategoryType = string;

export const SECTION_IDS = [
  'section-vencidas',
  'section-hoje',
  'section-amanha',
  'section-esta-semana',
  'section-semana-que-vem',
  'section-eventos-futuros',
  'section-sem-data',
  'section-completadas',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_TO_LIST: Record<SectionId, ListType> = {
  'section-vencidas': 'overdue',
  'section-hoje': 'today',
  'section-amanha': 'week',
  'section-esta-semana': 'week',
  'section-semana-que-vem': 'week',
  'section-eventos-futuros': 'later',
  'section-sem-data': 'noDate',
  'section-completadas': 'completed',
};

export const LIST_TO_SECTION: Partial<Record<ListType, SectionId>> = {
  overdue: 'section-vencidas',
  today: 'section-hoje',
  week: 'section-amanha',
  later: 'section-eventos-futuros',
  noDate: 'section-sem-data',
  completed: 'section-completadas',
};

// ─────────────────────────────────────────────────────────────────────────────

export interface SidebarProps {
  selectedList?: ListType | null;
  selectedCustomListId?: string | null;
  selectedCategory?: CategoryType | null;
  onListSelect?: (listType: ListType) => void;
  onCustomListSelect?: (listId: string) => void;
  onCategorySelect?: (category: CategoryType) => void;
  addButtonRef?: RefObject<HTMLButtonElement>;
  taskCounts?: {
    all?: number;
    today?: number;
    week?: number;
    later?: number;
    noDate?: number;
  };
  categories?: Array<{ id: string; name: string; count: number }>;
  customLists?: Array<{ id: string; name: string }>;
  /** Imperative ref — caller sets this to open the SettingsDialog on any page */
  openSettingsRef?: MutableRefObject<((page: SettingsPage) => void) | null>;
  /** When true, collapses the sidebar; restores previous state when false */
  forceCollapsed?: boolean;
}

// ── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS: Array<{ id: ListType; label: string; icon: typeof Checks }> = [
  { id: 'all', label: 'Lista de tarefas', icon: Checks },
  { id: 'later', label: 'Calendário', icon: CalendarDots },
  { id: 'noDate', label: 'Sem data', icon: Tray },
  { id: 'overdue', label: 'Vencidas', icon: HourglassLow },
  { id: 'recurring', label: 'Recorrentes', icon: Repeat },
];

type WhatsAppPromoPlacement = 'hidden' | 'modal' | 'floating';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const whatsAppPromoPlacementRequests = new Map<
  string,
  Promise<WhatsAppPromoPlacement>
>();

const getWhatsAppPromoPlacement = (
  userId: string,
  token: string
): Promise<WhatsAppPromoPlacement> => {
  const existingRequest = whatsAppPromoPlacementRequests.get(userId);
  if (existingRequest) return existingRequest;

  const request = fetch(`${API_URL}/api/users/whatsapp-promo/impression`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Não foi possível carregar a promoção do WhatsApp');
      }

      const data = (await response.json()) as { placement?: WhatsAppPromoPlacement };
      return data.placement === 'modal' || data.placement === 'floating'
        ? data.placement
        : 'hidden';
    })
    .catch((error) => {
      whatsAppPromoPlacementRequests.delete(userId);
      throw error;
    });

  whatsAppPromoPlacementRequests.set(userId, request);
  return request;
};

const dismissWhatsAppPromo = async (userId: string, token: string): Promise<void> => {
  const response = await fetch(`${API_URL}/api/users/whatsapp-promo/dismiss`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Não foi possível ocultar a promoção do WhatsApp');
  }

  whatsAppPromoPlacementRequests.set(userId, Promise.resolve('hidden'));
};

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  selectedList = 'all',
  selectedCustomListId = null,
  selectedCategory,
  onListSelect,
  onCustomListSelect,
  onCategorySelect,
  addButtonRef,
  taskCounts: _taskCounts = {},
  categories = [],
  customLists = [],
  openSettingsRef,
  forceCollapsed,
}: SidebarProps) {
  const { isMobile, close: closeMobileSidebar } = useMobileSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const settingsPushedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const prevCollapsedRef = useRef<boolean>(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(() => categories.length > 0);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(() => customLists.length > 0);
  const [whatsAppPromoPlacement, setWhatsAppPromoPlacement] =
    useState<WhatsAppPromoPlacement>('hidden');

  useEffect(() => {
    if (categories.length > 0) setIsCategoriesExpanded(true);
  }, [categories.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (customLists.length > 0) setIsFiltersExpanded(true);
  }, [customLists.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialPage, setSettingsInitialPage] = useState<SettingsPage>('profile');
  // On mobile, settings open as a bottom sheet instead of the desktop modal.
  const [mobileSettingsPage, setMobileSettingsPage] = useState<SettingsPage | null>(null);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [profileOverlay, setProfileOverlay] = useState<SettingsProfileOverlay | null>(null);

  useEffect(() => {
    if (!isSettingsOpen && mobileSettingsPage === null) {
      setProfileOverlay(null);
    }
  }, [isSettingsOpen, mobileSettingsPage]);

  // Opens a settings page — bottom sheet on mobile, modal on desktop.
  const pushAccountSearch = (page: SettingsPage, extra?: { app?: string }) => {
    const params = new URLSearchParams(location.search);
    params.set(CONTA_PARAM, page);
    if (extra?.app) params.set(APP_PARAM, extra.app);
    else if (page !== 'apps') params.delete(APP_PARAM);
    settingsPushedRef.current = true;
    navigate({
      pathname: tasksPathname(location.pathname),
      search: `?${params.toString()}`,
    });
  };

  const stripAccountSearch = (replace = true) => {
    const params = new URLSearchParams(location.search);
    params.delete(CONTA_PARAM);
    params.delete(APP_PARAM);
    navigate(
      {
        pathname: tasksPathname(location.pathname),
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace },
    );
  };

  const openSettings = (page: SettingsPage, extra?: { app?: string }) => {
    pushAccountSearch(page, extra);
    if (isMobile) {
      setMobileSettingsPage(page);
    } else {
      setSettingsInitialPage(page);
      setIsSettingsOpen(true);
    }
  };

  useEffect(() => {
    if (!openSettingsRef) return;
    openSettingsRef.current = (page: SettingsPage) => openSettings(page);
    return () => { openSettingsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSettingsRef, isMobile]);

  useEffect(() => {
    if (forceCollapsed) {
      prevCollapsedRef.current = isCollapsed;
      setIsCollapsed(true);
    } else {
      setIsCollapsed(prevCollapsedRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceCollapsed]);

  const collapsedProfileButtonRef = useRef<HTMLButtonElement>(null);
  const expandedProfileButtonRef = useRef<HTMLButtonElement>(null);

  const isDesktopCollapsed =
    !isMobile && (forceCollapsed || (isCollapsed && !isHoverExpanded));

  const profileButtonRef =
    isDesktopCollapsed ? collapsedProfileButtonRef : expandedProfileButtonRef;

  const { user, token, logout } = useAuth();
  const { subscription, daysLeftInTrial } = useSubscription();
  const { isLight } = useTheme();
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind | null>(null);

  const showProCta = subscription?.status !== 'active';

  useEffect(() => {
    if (import.meta.env.DEV) {
      const previewPlacement = new URLSearchParams(location.search).get('whatsappPromo');
      if (
        previewPlacement === 'modal' ||
        previewPlacement === 'floating' ||
        previewPlacement === 'hidden'
      ) {
        setWhatsAppPromoPlacement(previewPlacement);
        return;
      }
    }

    if (!token || !user?.id) {
      setWhatsAppPromoPlacement('hidden');
      return;
    }

    let cancelled = false;

    const loadWhatsAppPromoPlacement = async () => {
      try {
        const placement = await getWhatsAppPromoPlacement(user.id, token);
        if (!cancelled) setWhatsAppPromoPlacement(placement);
      } catch (error) {
        console.error('Error loading WhatsApp promo placement:', error);
        if (!cancelled) setWhatsAppPromoPlacement('hidden');
      }
    };

    void loadWhatsAppPromoPlacement();
    return () => {
      cancelled = true;
    };
  }, [location.search, token, user?.id]);

  useEffect(() => {
    const handleWhatsAppLinkChange = (event: Event) => {
      const linked = (event as CustomEvent<{ linked?: boolean }>).detail?.linked;
      setWhatsAppPromoPlacement(linked === false ? 'floating' : 'hidden');
    };

    window.addEventListener('jarvi:whatsapp-link-changed', handleWhatsAppLinkChange);
    return () => {
      window.removeEventListener('jarvi:whatsapp-link-changed', handleWhatsAppLinkChange);
    };
  }, []);

  useEffect(() => {
    const conta = parseSettingsPage(searchParams.get(CONTA_PARAM));
    if (!conta) {
      setIsSettingsOpen(false);
      setMobileSettingsPage(null);
      return;
    }
    if (isMobile) {
      setMobileSettingsPage(conta);
    } else {
      setSettingsInitialPage(conta);
      setIsSettingsOpen(true);
    }
  }, [searchParams, isMobile]);

  useEffect(() => {
    const feedback = searchParams.get(FEEDBACK_PARAM);
    if (feedback === 'ideas' || feedback === 'report') {
      setFeedbackKind(feedback);
    } else {
      setFeedbackKind(null);
    }
  }, [searchParams]);

  // ── Nav click handler ───────────────────────────────────────────────────────
  const handleNavClick = (listType: ListType) => {
    onListSelect?.(listType);
    closeMobileSidebar();
  };

  const handleCategoryClick = (category: CategoryType) => {
    onCategorySelect?.(category);
    closeMobileSidebar();
  };

  const handleCustomListClick = (listId: string) => {
    onCustomListSelect?.(listId);
    closeMobileSidebar();
  };

  const isNavItemActive = (itemId: ListType): boolean =>
    selectedList === itemId && !selectedCategory && !selectedCustomListId;

  // ── User info ───────────────────────────────────────────────────────────────
  const userName = user?.preferred_name || user?.name || 'Usuário';
  const userAvatar = user?.avatar;
  const planLabel =
    subscription?.status === 'trialing' && daysLeftInTrial !== null && daysLeftInTrial > 0
      ? `${daysLeftInTrial} ${daysLeftInTrial === 1 ? 'dia' : 'dias'} para testar`
      : subscription?.status === 'active'
        ? 'Plano Pro'
        : 'Plano Gratuito';

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
  };

  const handleSettings = () => {
    setIsDropdownOpen(false);
    openSettings('profile');
  };

  const handleUpgradeClick = () => {
    openSettings('payments');
  };

  const handleAddCategory = () => {
    openSettings('categories');
  };

  const handleAddFilter = () => {
    setIsSettingsOpen(false);
    setMobileSettingsPage(null);
    setIsCreateListOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
    if (searchParams.has(CONTA_PARAM)) {
      if (settingsPushedRef.current && window.history.length > 1) {
        settingsPushedRef.current = false;
        navigate(-1);
      } else {
        stripAccountSearch(true);
      }
    }
  };

  const handleCloseMobileSettings = () => {
    setMobileSettingsPage(null);
    if (searchParams.has(CONTA_PARAM)) {
      if (settingsPushedRef.current && window.history.length > 1) {
        settingsPushedRef.current = false;
        navigate(-1);
      } else {
        stripAccountSearch(true);
      }
    }
  };

  // Picks a settings page from the mobile user dropdown.
  const handleMobileSettingsSelect = (page: SettingsPage) => {
    setIsDropdownOpen(false);
    setMobileSettingsPage(page);
    closeMobileSidebar();
  };

  const isSidebarLocked = !isMobile && !isCollapsed;

  const handleSidebarLockToggle = () => {
    if (isMobile) {
      closeMobileSidebar();
      return;
    }
    setIsCollapsed((prev) => !prev);
  };

  const sidebarToggleLabel = isMobile
    ? 'Fechar menu'
    : isSidebarLocked
      ? 'Recolher menu'
      : 'Fixar menu expandido';

  const handleSidebarMouseEnter = () => {
    if (!isMobile && !forceCollapsed) setIsHoverExpanded(true);
  };

  const handleSidebarMouseLeave = () => {
    if (!isMobile) setIsHoverExpanded(false);
  };

  const renderSidebarToggleButton = () => (
    <span className={styles.sidebarToggleWrap}>
      <Button
        variant="ghost"
        size="small"
        icon={SidebarSimple}
        iconPosition="icon-only"
        iconWeight={isSidebarLocked ? 'fill' : 'regular'}
        active={isSidebarLocked}
        onClick={handleSidebarLockToggle}
        aria-label={sidebarToggleLabel}
        aria-pressed={!isMobile ? isSidebarLocked : undefined}
      />
    </span>
  );

  // ── Single root — animates between expanded / collapsed via CSS ─────────────
  return (
    <div
      className={styles.sidebar}
      data-collapsed={isDesktopCollapsed || undefined}
      data-locked={isSidebarLocked || undefined}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      {/* ── Collapsed panel (absolutely fills root, fades in when collapsed) ── */}
      <div className={styles.collapsedPanel}>
        {/* Avatar button */}
        <button
          ref={collapsedProfileButtonRef}
          className={styles.collapsedAvatarButton}
          onClick={() => setIsDropdownOpen((v) => !v)}
          type="button"
          aria-label="Menu do usuário"
        >
          <Avatar src={userAvatar} name={userName} size="medium" />
        </button>

        {/* Nav items — icon only */}
        <div className={styles.collapsedNavList}>
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(item.id);
            return (
              <Tooltip key={item.id} label={item.label} position="right" showDelay={300}>
                <Button
                  variant="ghost"
                  size="small"
                  icon={item.icon}
                  iconPosition="icon-only"
                  active={active}
                  className={`${styles.collapsedNavButton} ${active ? styles.collapsedNavButtonActive : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  aria-label={item.label}
                />
              </Tooltip>
            );
          })}
        </div>

        {/* Categories icon */}
        {categories.length > 0 && (
          <div className={styles.collapsedNavList}>
            <Tooltip label="Categorias" position="right" showDelay={300}>
              <Button
                variant="ghost"
                size="small"
                icon={Hash}
                iconPosition="icon-only"
                className={styles.collapsedNavButton}
                aria-label="Categorias"
              />
            </Tooltip>
          </div>
        )}

        {/* Custom lists icon */}
        {customLists.length > 0 && (
          <div className={styles.collapsedNavList}>
            <Tooltip label="Filtros" position="right" showDelay={300}>
              <Button
                variant="ghost"
                size="small"
                icon={FunnelSimple}
                iconPosition="icon-only"
                className={styles.collapsedNavButton}
                aria-label="Filtros"
              />
            </Tooltip>
          </div>
        )}

        {/* Collapsed footer: action buttons + compact ThemeToggle last */}
        <div className={styles.collapsedFooter}>
          <Tooltip label="Sugerir ideias" position="right" showDelay={300}>
            <button
              type="button"
              className={styles.footerBugButton}
              aria-label="Sugerir ideias"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set(FEEDBACK_PARAM, 'ideas');
                settingsPushedRef.current = true;
                navigate({
                  pathname: tasksPathname(location.pathname),
                  search: `?${params.toString()}`,
                });
              }}
            >
              <Lightbulb size={20} />
            </button>
          </Tooltip>
          <Tooltip label="Reportar problema" position="right" showDelay={300}>
            <button
              type="button"
              className={styles.footerBugButton}
              aria-label="Reportar problema"
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set(FEEDBACK_PARAM, 'report');
                settingsPushedRef.current = true;
                navigate({
                  pathname: tasksPathname(location.pathname),
                  search: `?${params.toString()}`,
                });
              }}
            >
              <Bug size={20} />
            </button>
          </Tooltip>
          <Tooltip
            label={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
            position="right"
            showDelay={300}
          >
            <ThemeToggle compact />
          </Tooltip>
        </div>
      </div>

      {/* ── Expanded panel (fades out when collapsed) ── */}
      <div className={styles.expandedPanel}>
        {/* SidebarHeader */}
        <div className={styles.header}>
          {/* User row */}
          <div className={styles.userRow}>
            <SidebarUserMenu
              ref={expandedProfileButtonRef}
              src={userAvatar}
              name={userName}
              plan={planLabel}
              isActive={isDropdownOpen}
              onClick={() => setIsDropdownOpen((v) => !v)}
            />

            <Tooltip label={sidebarToggleLabel} position="bottom" showDelay={300}>
              {renderSidebarToggleButton()}
            </Tooltip>
          </div>

          {/* Pro CTA */}
          {showProCta && (
            <div className={styles.proCta}>
              <UpgradeButton
                label="Fazer upgrade"
                size="large"
                fullWidth
                onClick={handleUpgradeClick}
              />
            </div>
          )}
        </div>

        {/* SidebarBody */}
        <div className={styles.body}>
          {/* Primary nav group */}
          <div className={styles.groupNav}>
            <div className={styles.navList}>
              {NAV_ITEMS.map((item) => (
                <ListItem
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={isNavItemActive(item.id)}
                  onClick={() => handleNavClick(item.id)}
                />
              ))}
            </div>
          </div>

          {/* Categorias group */}
          <div className={styles.groupSection}>
            <div className={styles.groupHeaderWrapper}>
              <SidebarGroupHeader
                label="Categorias"
                isExpanded={isCategoriesExpanded}
                onToggle={() => setIsCategoriesExpanded((v) => !v)}
                showAddButton
                onAdd={handleAddCategory}
                addButtonRef={addButtonRef}
              />
            </div>
            {isCategoriesExpanded && (
              <div className={`${styles.navList} ${styles.navListScrollable}`}>
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <ListItem
                      key={category.id}
                      label={category.name}
                      icon={Hash}
                      active={selectedCategory === category.name}
                      onClick={() => handleCategoryClick(category.name)}
                    />
                  ))
                ) : (
                  <SidebarEmptyState
                    description="Use categorias para filtrar, priorizar e visualizar melhor o que importa."
                    buttonLabel="Criar categoria"
                    onButtonClick={handleAddCategory}
                  />
                )}
              </div>
            )}
          </div>

          {/* Filtros group */}
          <div className={`${styles.groupSection} ${styles.groupSectionLast}`}>
            <div className={styles.groupHeaderWrapper}>
              <SidebarGroupHeader
                label="Filtros"
                isExpanded={isFiltersExpanded}
                onToggle={() => setIsFiltersExpanded((v) => !v)}
                showAddButton
                onAdd={handleAddFilter}
              />
            </div>
            {isFiltersExpanded && (
              <div className={`${styles.navList} ${styles.navListScrollable}`}>
                {customLists.length > 0 ? (
                  customLists.map((list) => (
                    <ListItem
                      key={list.id}
                      label={list.name}
                      icon={FunnelSimple}
                      active={selectedCustomListId === list.id}
                      onClick={() => handleCustomListClick(list.id)}
                    />
                  ))
                ) : (
                  <SidebarEmptyState
                    description="Use filtros para organizar tarefas com critérios personalizados."
                    buttonLabel="Criar filtro"
                    onButtonClick={handleAddFilter}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Expanded footer: ThemeToggle + label + action buttons */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <ThemeToggle />
            <span className={styles.footerThemeLabel}>
              {isLight ? 'Modo Claro' : 'Modo Escuro'}
            </span>
          </div>
          <div className={styles.footerActions}>
            <Tooltip label="Sugerir ideias" position="top" showDelay={300}>
              <button
                type="button"
                className={styles.footerBugButton}
                aria-label="Sugerir ideias"
                onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set(FEEDBACK_PARAM, 'ideas');
                settingsPushedRef.current = true;
                navigate({
                  pathname: tasksPathname(location.pathname),
                  search: `?${params.toString()}`,
                });
              }}
              >
                <Lightbulb size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Reportar problema" position="top" showDelay={300}>
              <button
                type="button"
                className={styles.footerBugButton}
                aria-label="Reportar problema"
                onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set(FEEDBACK_PARAM, 'report');
                settingsPushedRef.current = true;
                navigate({
                  pathname: tasksPathname(location.pathname),
                  search: `?${params.toString()}`,
                });
              }}
              >
                <Bug size={20} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Shared: Dropdown + Settings — always rendered regardless of state */}
      <Dropdown
        isOpen={isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        anchorRef={profileButtonRef}
        align="left"
        position="top"
        width={isMobile ? 240 : 200}
        gap={isDesktopCollapsed ? 6 : 8}
        offsetX={isDesktopCollapsed ? 2 : 0}
      >
        {isMobile ? (
          <>
            {SIDEBAR_ITEMS.map((item) => (
              <ListItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                iconWeight={item.iconWeight}
                onClick={() => handleMobileSettingsSelect(item.id)}
              />
            ))}
            <Divider />
            <ListItem label="Sair" icon={SignOut} onClick={handleLogout} />
          </>
        ) : (
          <>
            <ListItem label="Minha Conta" icon={Gear} onClick={handleSettings} />
            <ListItem label="Sair" icon={SignOut} onClick={handleLogout} />
          </>
        )}
      </Dropdown>

      {/* First impression: centered modal with overlay */}
      <Dialog
        isOpen={whatsAppPromoPlacement === 'modal'}
        onClose={() => setWhatsAppPromoPlacement('hidden')}
        width="md"
        showCloseButton={false}
        className={styles.whatsNewModal}
        contentClassName={styles.whatsNewModalContent}
        overlayClassName={styles.whatsNewModalOverlay}
      >
        <WhatsNewCard
          variant="welcome"
          onAction={() => {
            setWhatsAppPromoPlacement('hidden');
            if (user?.id && token) {
              void dismissWhatsAppPromo(user.id, token).catch((error) => {
                console.error('Error dismissing WhatsApp promo:', error);
                whatsAppPromoPlacementRequests.delete(user.id);
              });
            }
            openSettings('apps', { app: 'whatsapp' });
          }}
          onSecondaryAction={() => {
            setWhatsAppPromoPlacement('hidden');
            if (user?.id && token) {
              void dismissWhatsAppPromo(user.id, token).catch((error) => {
                console.error('Error dismissing WhatsApp promo:', error);
                whatsAppPromoPlacementRequests.delete(user.id);
              });
            }
          }}
        />
      </Dialog>

      {/* Later sessions: floating card without an overlay */}
      {whatsAppPromoPlacement === 'floating' &&
        createPortal(
          <div className={styles.whatsNewFloatingCard}>
            <WhatsNewCard
              onClose={() => setWhatsAppPromoPlacement('hidden')}
              onAction={() => {
                setWhatsAppPromoPlacement('hidden');
                openSettings('apps', { app: 'whatsapp' });
              }}
              onSecondaryAction={() => {
                setWhatsAppPromoPlacement('hidden');
                if (user?.id && token) {
                  void dismissWhatsAppPromo(user.id, token).catch((error) => {
                    console.error('Error dismissing WhatsApp promo:', error);
                    whatsAppPromoPlacementRequests.delete(user.id);
                  });
                }
              }}
            />
          </div>,
          document.body
        )}

      <FeedbackDialog
        kind={feedbackKind}
        isOpen={feedbackKind !== null}
        onClose={() => {
          setFeedbackKind(null);
          if (!searchParams.has(FEEDBACK_PARAM)) return;
          if (settingsPushedRef.current && window.history.length > 1) {
            settingsPushedRef.current = false;
            navigate(-1);
          } else {
            const params = new URLSearchParams(location.search);
            params.delete(FEEDBACK_PARAM);
            navigate(
              {
                pathname: tasksPathname(location.pathname),
                search: params.toString() ? `?${params.toString()}` : '',
              },
              { replace: true },
            );
          }
        }}
      />

      {/* Desktop: full settings modal (hidden while a profile child overlay is open) */}
      <SettingsDialog
        isOpen={isSettingsOpen && profileOverlay === null && !isCreateListOpen}
        onClose={handleCloseSettings}
        initialPage={settingsInitialPage}
        initialApp={searchParams.get(APP_PARAM) === 'whatsapp' ? 'whatsapp' : undefined}
        onOpenProfileOverlay={setProfileOverlay}
        onOpenCreateList={() => {
          setIsSettingsOpen(false);
          setIsCreateListOpen(true);
        }}
      />

      {/* Mobile: single settings page in a bottom sheet */}
      <BottomSheet
        isOpen={mobileSettingsPage !== null && profileOverlay === null && !isCreateListOpen}
        onClose={handleCloseMobileSettings}
        title={SIDEBAR_ITEMS.find((item) => item.id === mobileSettingsPage)?.label}
      >
        {mobileSettingsPage && (
          <SettingsPageContent
            page={mobileSettingsPage}
            onClose={handleCloseMobileSettings}
            hideHeader
            onOpenProfileOverlay={setProfileOverlay}
            initialApp={searchParams.get(APP_PARAM) === 'whatsapp' ? 'whatsapp' : undefined}
            onOpenCreateList={() => {
              setMobileSettingsPage(null);
              setIsCreateListOpen(true);
            }}
          />
        )}
      </BottomSheet>

      <CreateListPopover
        isOpen={isCreateListOpen}
        onClose={() => {
          setIsCreateListOpen(false);
          openSettings('filters');
        }}
      />

      <ChangePasswordDialog
        isOpen={profileOverlay === 'password'}
        onClose={() => setProfileOverlay(null)}
      />
      <DisconnectGoogleDialog
        isOpen={profileOverlay === 'disconnect'}
        onClose={() => setProfileOverlay(null)}
      />
      <DeleteAccountDialog
        isOpen={profileOverlay === 'delete'}
        onClose={() => setProfileOverlay(null)}
        onDeleted={() => {
          setProfileOverlay(null);
          logout();
        }}
      />
    </div>
  );
}
