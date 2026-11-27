import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from '@heroui/react';
import { Ghost, Menu, Volume2, VolumeX } from 'lucide-react';
import { GhostShieldIcon } from '../ghost/GhostShieldIcon';
import { useImmersion } from '../../immersion/ImmersionContext';
import { NAV, to } from '../../routes';

export function TopNav() {
  const { pathname } = useLocation();
  const { soundOn, toggleSound } = useImmersion();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Auto-close mobile nav drawer if viewport grows into tablet/desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      if (mq.matches) setMenuOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  const linkClass = (isActive: boolean) =>
    [
      'inline-flex h-9 items-center font-ui text-sm sm:text-[15px] transition-colors duration-150 rounded-lg px-3',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
      isActive
        ? 'bg-violet-600/30 text-white font-semibold shadow-glow-sm'
        : 'text-white/85 hover:text-white hover:bg-white/10',
    ].join(' ');

  return (
    <Navbar
      maxWidth="xl"
      height="auto"
      aria-label="Primary navigation"
      className="sticky top-0 z-50 bg-[#0d0714]/90 py-1.5 sm:py-2 backdrop-blur-xl text-white"
      classNames={{
        wrapper: 'px-4 sm:px-6',
      }}
    >
      <NavbarBrand className="grow-0">
        <Link
          to={to('home')}
          className="flex shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon"
          aria-label="Haunted Audit — home"
          aria-current={pathname === to('home') ? 'page' : undefined}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600/25 text-violet-neon shadow-glow-sm"
            aria-hidden="true"
          >
            <Ghost size={18} />
          </span>
          <span
            className="text-[1.05rem] leading-none text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Haunted Audit
          </span>
        </Link>
      </NavbarBrand>

      <NavbarContent justify="center" className="hidden md:flex">
        <ul id="tour-nav-links" className="m-0 flex list-none items-center gap-1.5 p-0" role="list">
          {NAV.map((link) => (
            <NavbarItem key={link.label}>
              <Link
                to={link.to}
                className={linkClass(link.isCurrent(pathname))}
                aria-current={link.isCurrent(pathname) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <NavbarContent justify="end" id="tour-top-controls" className="gap-2">
        <NavbarItem>
          <Button
            type="button"
            isIconOnly
            radius="full"
            variant="flat"
            size="sm"
            onPress={toggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Turn Halloween background audio off' : 'Turn Halloween background audio on'}
            className={[
              'h-8 w-8 min-w-8 text-white',
              soundOn ? 'bg-violet-600/35 shadow-glow-sm' : 'bg-base-panel/80 hover:bg-white/10',
            ].join(' ')}
          >
            {soundOn ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
          </Button>
        </NavbarItem>

        <NavbarItem className="hidden sm:flex">
          <Link
            to={to('kiro')}
            className={[
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-white transition-colors shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-neon',
              pathname === to('kiro')
                ? 'bg-violet-600/40 shadow-glow-sm'
                : 'bg-violet-600/20 hover:bg-violet-600/30',
            ].join(' ')}
            aria-label="Built with Kiro"
            aria-current={pathname === to('kiro') ? 'page' : undefined}
          >
            <GhostShieldIcon size={14} />
            <span>Kiro</span>
          </Link>
        </NavbarItem>

        <NavbarItem className="md:hidden">
          <Button
            type="button"
            isIconOnly
            size="sm"
            variant="flat"
            className="h-9 w-9 min-w-9 bg-base-panel/80 text-white hover:bg-white/10"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onPress={() => setMenuOpen((o) => !o)}
          >
            <Menu size={18} aria-hidden="true" />
          </Button>
        </NavbarItem>
      </NavbarContent>

      <Drawer
        isOpen={menuOpen}
        onOpenChange={setMenuOpen}
        placement="right"
        size="xs"
        classNames={{
          wrapper: 'md:hidden',
          backdrop: 'md:hidden',
          base: 'bg-[#12091f] text-white',
          header: 'text-white',
        }}
      >
        <DrawerContent>
          <DrawerHeader className="flex items-center gap-2 text-base font-bold text-white">
            <Ghost size={18} className="text-violet-neon" aria-hidden="true" />
            <span>Navigation</span>
          </DrawerHeader>
          <DrawerBody className="py-4">
            <nav aria-label="Primary navigation drawer">
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0" role="list">
                {NAV.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className={[linkClass(link.isCurrent(pathname)), 'w-full'].join(' ')}
                      aria-current={link.isCurrent(pathname) ? 'page' : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to={to('kiro')}
                    className={[linkClass(pathname === to('kiro')), 'w-full'].join(' ')}
                    aria-current={pathname === to('kiro') ? 'page' : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    Built with Kiro
                  </Link>
                </li>
              </ul>
            </nav>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Navbar>
  );
}
