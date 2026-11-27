import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Button,
  Divider,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Switch,
} from '@heroui/react';
import { Menu, Settings, X } from 'lucide-react';
import { GhostFigure } from '../ghost/GhostFigure';
import { GhostShieldIcon } from '../ghost/GhostShieldIcon';
import { useImmersion } from '../../immersion/ImmersionContext';
import { APP_NAV, NAV, to } from '../../routes';

export function TopNav() {
  const { pathname } = useLocation();
  const { calm, toggleCalm, soundOn, toggleSound } = useImmersion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setPopoverOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      if (mq.matches) setMenuOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <Navbar
      maxWidth="2xl"
      height="54px"
      isBlurred={false}
      isMenuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      aria-label="Primary navigation"
      className={[
        'sticky top-0 z-50 text-white transition-colors duration-200',
        scrolled || menuOpen ? 'bg-[#08060f]/90 backdrop-blur-md' : 'bg-transparent',
      ].join(' ')}
      classNames={{
        wrapper: 'mx-auto max-w-[1360px] px-3 sm:px-6 gap-4',
        menu: 'bg-[#0b0818]/98 backdrop-blur-xl pt-4 pb-8 px-4 gap-1.5 border-t border-[#2a2350] z-50',
      }}
    >
      <NavbarContent justify="start" className="grow-0 gap-2">
        <NavbarMenuToggle
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          icon={(isOpen) => (isOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />)}
          className="h-[38px] w-[38px] min-w-[38px] rounded-[12px] border border-[#3a3363] bg-[#140f2a] text-[#cfc6ff] hover:text-white lg:hidden"
        />
        <NavbarBrand className="grow-0 shrink-0">
          <Link
            to={to('home')}
            className="inline-flex items-center gap-2.5 rounded-lg py-1 pr-2 text-[19px] font-extrabold tracking-tight text-white no-underline hover:text-violet-200"
            aria-label="Haunted Audit — home"
            aria-current={pathname === to('home') ? 'page' : undefined}
          >
            <GhostFigure tone="white" face="happy" size={32} className="drop-shadow-[0_0_6px_#fff8]" />
            <span className="whitespace-nowrap">Haunted Audit</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Exact design/v9 top navigation links: Home · Scans · Journeys · Fixes · Kiro · Reports */}
      <NavbarContent justify="center" className="hidden lg:flex gap-[34px]" id="tour-nav-links">
        {NAV.map((link) => {
          const active = link.isCurrent(pathname);
          return (
            <NavbarItem key={link.label} isActive={active}>
              <Link
                to={link.to}
                className={[
                  'inline-flex h-8 items-center rounded-md px-0.5 text-[15.5px] no-underline transition-colors',
                  active
                    ? 'font-bold text-white [text-shadow:0_0_12px_#c4b5fd]'
                    : 'font-medium text-[#d6d9f3] hover:text-white',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </NavbarItem>
          );
        })}
      </NavbarContent>

      {/* Exact design/v9 right controls: Kiro hourglass pill + Settings gear button */}
      <NavbarContent justify="end" id="tour-top-controls" className="grow-0 gap-2.5">
        <NavbarItem className="hidden sm:flex">
          <Button
            as={Link}
            to={to('kiro')}
            role="link"
            size="sm"
            variant="flat"
            startContent={<GhostShieldIcon size={16} />}
            aria-label="Built with Kiro"
            aria-current={pathname === to('kiro') ? 'page' : undefined}
            className="h-[38px] rounded-[12px] border-[1.5px] border-[#a78bfa] bg-gradient-to-b from-[#3b1f86] to-[#26135a] px-3.5 text-[15px] font-bold text-white shadow-[0_0_14px_#8b5cf688] hover:brightness-110"
          >
            Kiro
          </Button>
        </NavbarItem>

        <NavbarItem>
          <Popover
            isOpen={popoverOpen}
            onOpenChange={setPopoverOpen}
            placement="bottom-end"
            classNames={{
              content: 'border border-[#2b3254] bg-[#151a33] p-3.5 text-white shadow-2xl',
            }}
          >
            <PopoverTrigger>
              <Button
                type="button"
                isIconOnly
                size="sm"
                variant="flat"
                aria-label="Display settings"
                className="h-[38px] w-[38px] min-w-[38px] rounded-[12px] border border-[#3a3363] bg-[#140f2a] text-[#cfc6ff] hover:text-white"
              >
                <Settings size={17} aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="flex w-full flex-col gap-3">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Display &amp; Audio
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white">Calm mode (no motion)</span>
                  <Switch size="sm" color="secondary" isSelected={calm} onValueChange={toggleCalm} aria-label="Calm mode" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white">Spooky sound</span>
                  <Switch size="sm" color="secondary" isSelected={soundOn} onValueChange={toggleSound} aria-label="Spooky sound" />
                </div>
                <Button
                  as={Link}
                  to={to('app-settings')}
                  role="link"
                  size="sm"
                  variant="flat"
                  onPress={() => setPopoverOpen(false)}
                  className="mt-1 border border-[#3a3363] bg-[#0d1022] font-semibold text-violet-200"
                >
                  Open full Settings
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </NavbarItem>
      </NavbarContent>

      {/* Single Mobile/Tablet Unified HeroUI Menu (lg:hidden) */}
      <NavbarMenu
        motionProps={{
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: { duration: 0.12 },
        }}
      >
        <li className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Navigation
        </li>
        {NAV.map((link) => {
          const active = link.isCurrent(pathname);
          return (
            <NavbarMenuItem key={link.label} isActive={active}>
              <Button
                as={Link}
                to={link.to}
                role="link"
                fullWidth
                size="sm"
                radius="lg"
                variant={active ? 'flat' : 'light'}
                onPress={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'h-9 justify-start bg-gradient-to-r from-[#3a2479] to-[#2a1a5c] px-3 font-bold text-white shadow-[inset_3px_0_0_#b794ff]'
                    : 'h-9 justify-start px-3 font-medium text-[#d6d9f3]'
                }
              >
                {link.label}
              </Button>
            </NavbarMenuItem>
          );
        })}

        <li className="py-1" aria-hidden="true">
          <Divider className="bg-[#2a2350]" />
        </li>
        <li className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
          Workspace
        </li>
        {APP_NAV.filter((a) => !NAV.some((n) => n.to === a.to)).map((item) => {
          const active = item.isCurrent(pathname);
          return (
            <NavbarMenuItem key={item.to} isActive={active}>
              <Button
                as={Link}
                to={item.to}
                role="link"
                fullWidth
                size="sm"
                radius="lg"
                variant={active ? 'flat' : 'light'}
                onPress={() => setMenuOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'h-9 justify-start bg-gradient-to-r from-[#3a2479] to-[#2a1a5c] px-3 font-bold text-white'
                    : 'h-9 justify-start px-3 font-medium text-[#d6d9f3]'
                }
              >
                {item.label}
              </Button>
            </NavbarMenuItem>
          );
        })}
      </NavbarMenu>
    </Navbar>
  );
}
