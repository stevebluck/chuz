import { NavLink as RemixNavLink, Link as RemixLink } from "@remix-run/react";
import React from "react";
import { Route } from "src/Routes";

type LinkProps = {
  to: Route;
  reloadDocument?: boolean;
  replace?: boolean;
  preventScrollReset?: boolean;
  viewTransition?: boolean;
};

interface Props extends React.AnchorHTMLAttributes<HTMLAnchorElement>, LinkProps {}

export const Link = React.forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  return (
    <RemixLink {...props} ref={ref}>
      {props.children}
    </RemixLink>
  );
});

type NavLinkProps = LinkProps & {
  children: React.ReactNode;
  caseSensitive?: boolean;
  className?: string | ((props: NavLinkRenderProps) => string | undefined);
  end?: boolean;
  style?: React.CSSProperties | ((props: NavLinkRenderProps) => React.CSSProperties | undefined);
};

export type NavLinkRenderProps = {
  isActive: boolean;
  isPending: boolean;
  isTransitioning: boolean;
};

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>((props, ref) => {
  return (
    <RemixNavLink {...props} ref={ref}>
      {props.children}
    </RemixNavLink>
  );
});
