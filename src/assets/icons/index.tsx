export interface IconProps {
  className?: string;
}

export const Star = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <g clipPath="url(#clip0_550_55728)">
        <path
          d="M9.53834 1.60996C9.70914 1.19932 10.2909 1.19932 10.4617 1.60996L12.5278 6.57744C12.5998 6.75056 12.7626 6.86885 12.9495 6.88383L18.3123 7.31376C18.7556 7.3493 18.9354 7.90256 18.5976 8.19189L14.5117 11.6919C14.3693 11.8139 14.3071 12.0053 14.3506 12.1876L15.5989 17.4208C15.7021 17.8534 15.2315 18.1954 14.8519 17.9635L10.2606 15.1592C10.1006 15.0615 9.89938 15.0615 9.73937 15.1592L5.14806 17.9635C4.76851 18.1954 4.29788 17.8534 4.40108 17.4208L5.64939 12.1876C5.69289 12.0053 5.6307 11.8139 5.48831 11.6919L1.40241 8.19189C1.06464 7.90256 1.24441 7.3493 1.68773 7.31376L7.05054 6.88383C7.23744 6.86885 7.40024 6.75056 7.47225 6.57744L9.53834 1.60996Z"
          fill="currentColor"
        />
        <g clipPath="url(#clip1_550_55728)">
          <path
            d="M9.53834 1.60996C9.70914 1.19932 10.2909 1.19932 10.4617 1.60996L12.5278 6.57744C12.5998 6.75056 12.7626 6.86885 12.9495 6.88383L18.3123 7.31376C18.7556 7.3493 18.9354 7.90256 18.5976 8.19189L14.5117 11.6919C14.3693 11.8139 14.3071 12.0053 14.3506 12.1876L15.5989 17.4208C15.7021 17.8534 15.2315 18.1954 14.8519 17.9635L10.2606 15.1592C10.1006 15.0615 9.89938 15.0615 9.73937 15.1592L5.14806 17.9635C4.76851 18.1954 4.29788 17.8534 4.40108 17.4208L5.64939 12.1876C5.69289 12.0053 5.6307 11.8139 5.48831 11.6919L1.40241 8.19189C1.06464 7.90256 1.24441 7.3493 1.68773 7.31376L7.05054 6.88383C7.23744 6.86885 7.40024 6.75056 7.47225 6.57744L9.53834 1.60996Z"
            fill="currentColor"
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_550_55728">
          <rect width="20" height="20" fill="currentColor" />
        </clipPath>
        <clipPath id="clip1_550_55728">
          <rect width="20" height="20" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const Refresh = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"></path>
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"></path>
    </svg>
  );
};
export const Dropbox = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="8" cy="8" r="7" fill="#0F287F" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.5 4L3 5.5L5.5 7L3 8.5L5.5 10L8 8.5L10.5 10L13 8.5L10.5 7L13 5.5L10.5 4L8 5.5L5.5 4ZM8 5.5L10.5 7L8 8.5L5.5 7L8 5.5Z"
        fill="#DAF8FE"
      />
      <path d="M5.5 11L8 9.5L10.5 11L8 12.5L5.5 11Z" fill="#DAF8FE" />
    </svg>
  );
};

export const OneDrive = () => {
  return (
    <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <mask id="a" mask="alpha" maskUnits="userSpaceOnUse" x="0" y="3" width="16" height="10">
        <path
          d="M4 13c-2 0-4-2-4-4s2-4 4-4l4-2c2 0 4 2 5 4 2 0 3 1 3 3s-1 3-3 3H4Z"
          fill="#C4C4C4"
        />
      </mask>
      <g mask="url(#a)">
        <path d="m4 13-3-1 8-4 6 4-2 1H4Z" fill="url(#b)" />
        <path d="M13 7 9 8l6 4 1-2c0-2-1-3-3-3Z" fill="url(#c)" />
        <path d="m4 5 5 3 4-1c-1-2-3-4-5-4L4 5Z" fill="url(#d)" />
        <path d="m1 12 8-4-5-3C2 6 0 7 0 9l1 3Z" fill="url(#e)" />
      </g>
      <defs>
        <linearGradient
          id="b"
          x1="2.2"
          y1="12.3"
          x2="13.6"
          y2="11.6"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#2086B8" />
          <stop offset="1" stop-color="#46D3F6" />
        </linearGradient>
        <linearGradient id="c" x1="11.9" y1="9.8" x2="15.1" y2="7.6" gradientUnits="userSpaceOnUse">
          <stop stop-color="#1694DB" />
          <stop offset="1" stop-color="#62C3FE" />
        </linearGradient>
        <linearGradient id="d" x1="4.3" y1="3.7" x2="11.7" y2="8" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0D3D78" />
          <stop offset="1" stop-color="#063B83" />
        </linearGradient>
        <linearGradient id="e" x1="-.2" y1="10" x2="7.3" y2="7.2" gradientUnits="userSpaceOnUse">
          <stop stop-color="#16589B" />
          <stop offset="1" stop-color="#1464B7" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const Box = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="16" height="16" rx="4" fill="#0075C9" />
      <path
        d="M8.50026 6.24521C7.50878 6.24521 6.64784 6.80372 6.21278 7.62359C5.77771 6.80369 4.91681 6.24527 3.92535 6.24527C3.34262 6.24527 2.80487 6.43816 2.3722 6.76372V4.57853H2.37196C2.36591 4.29693 2.13657 4.07031 1.85402 4.07031C1.57145 4.07031 1.34217 4.29693 1.33618 4.57853H1.33594V8.88247H1.33702C1.36003 10.2953 2.50965 11.4338 3.92532 11.4338C4.91678 11.4338 5.77771 10.8752 6.21275 10.0553C6.64784 10.8753 7.50875 11.4338 8.5002 11.4338C9.93029 11.4338 11.0896 10.2722 11.0896 8.8395C11.0896 7.40664 9.93026 6.24521 8.50026 6.24521ZM3.92532 10.3956C3.06751 10.3956 2.37217 9.69888 2.37217 8.83953C2.37217 7.98005 3.06754 7.28341 3.92532 7.28341C4.78314 7.28341 5.47851 7.98005 5.47851 8.83953C5.47851 9.69888 4.78314 10.3956 3.92532 10.3956ZM8.50026 10.3956C7.64242 10.3956 6.94711 9.69888 6.94711 8.83947C6.94711 7.97999 7.64245 7.28341 8.50026 7.28341C9.35802 7.28341 10.0534 7.97999 10.0534 8.83947C10.0534 9.69888 9.35802 10.3956 8.50026 10.3956Z"
        fill="white"
      />
      <path
        d="M14.5747 10.6162L13.2486 8.84032L14.5747 7.06437L14.5744 7.06416C14.7385 6.83535 14.6909 6.51619 14.465 6.34611C14.2391 6.17622 13.9199 6.21937 13.7463 6.44091L13.7461 6.44085L12.6016 7.97367L11.457 6.44085L11.4569 6.44112C11.2832 6.21937 10.9641 6.17622 10.7381 6.34623C10.5122 6.51631 10.4646 6.83547 10.6287 7.06422L10.6285 7.06437L11.9546 8.84032L10.6285 10.6162L10.6287 10.6164C10.4646 10.8452 10.5122 11.1643 10.7381 11.3343C10.9641 11.5044 11.2832 11.4612 11.4569 11.2396L11.457 11.2398L12.6016 9.70692L13.7461 11.2398L13.7463 11.2397C13.9199 11.4612 14.2391 11.5044 14.465 11.3344C14.6909 11.1644 14.7385 10.8453 14.5744 10.6165L14.5747 10.6162Z"
        fill="white"
      />
    </svg>
  );
};

export const VisaCardIcon = () => {
  return (
    <svg
      width="40"
      height="25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path fill="url(#a)" d="M1 1h39v24H1z" />
      <defs>
        <pattern id="a" patternContentUnits="objectBoundingBox" width="1" height="1">
          <use xlinkHref="#b" transform="matrix(.00694 0 0 .01116 0 0)" />
        </pattern>
        <image
          id="b"
          width="144"
          height="92"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
};

export const Mastercard = () => {
  return (
    <svg
      width="40"
      height="25"
      viewBox="0 0 40 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        x="0.671875"
        y="0.472656"
        width="39.2185"
        height="24.41"
        fill="url(#pattern0_2432_93270)"
      />
      <defs>
        <pattern
          id="pattern0_2432_93270"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_2432_93270"
            transform="matrix(0.003663 0 0 0.00588519 0 -0.0443802)"
          />
        </pattern>
        <image
          id="image0_2432_93270"
          width="273"
          height="185"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
};

export const ExcelIcon = ({ className = 'h-full w-full text-green-400' }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 384 512"
      className={className}
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M64 0C28.7 0 0 28.7 0 64L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-288-128 0c-17.7 0-32-14.3-32-32L224 0 64 0zM256 0l0 128 128 0L256 0zM155.7 250.2L192 302.1l36.3-51.9c7.6-10.9 22.6-13.5 33.4-5.9s13.5 22.6 5.9 33.4L221.3 344l46.4 66.2c7.6 10.9 5 25.8-5.9 33.4s-25.8 5-33.4-5.9L192 385.8l-36.3 51.9c-7.6 10.9-22.6 13.5-33.4 5.9s-13.5-22.6-5.9-33.4L162.7 344l-46.4-66.2c-7.6-10.9-5-25.8 5.9-33.4s25.8-5 33.4 5.9z"></path>
    </svg>
  );
};

export const AmericanExpress = () => {
  return (
    <svg
      width="41"
      height="25"
      viewBox="0 0 41 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        x="0.890625"
        y="0.472656"
        width="39.2185"
        height="24.41"
        fill="url(#pattern0_2432_93269)"
      />
      <defs>
        <pattern
          id="pattern0_2432_93269"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_2432_93269"
            transform="matrix(0.00444444 0 0 0.0071407 0 -0.299758)"
          />
        </pattern>
        <image
          id="image0_2432_93269"
          width="225"
          height="224"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
};

export const Paypal = () => {
  return (
    <svg
      width="86"
      height="81"
      viewBox="0 0 86 81"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        x="0.398438"
        y="0.398438"
        width="85.5484"
        height="80.5161"
        fill="url(#pattern0_2432_93328)"
      />
      <defs>
        <pattern
          id="pattern0_2432_93328"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use xlinkHref="#image0_2432_93328" transform="scale(0.00490196 0.00520833)" />
        </pattern>
        <image
          id="image0_2432_93328"
          width="204"
          height="192"
          xlinkHref="data:image/png;base64,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"
        />
      </defs>
    </svg>
  );
};

export const AssignedUserIcon = ({ className = '' }: IconProps) => {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15.0325 6.51127L12.0407 3.51952L13.0422 2.54147L15.0325 4.53176L19.0131 0.551191L20 1.55265L15.0325 6.51127ZM7.02453 6.55623C6.12039 6.55623 5.34801 6.23591 4.70737 5.59527C4.06673 4.95479 3.74641 4.1824 3.74641 3.27811C3.74641 2.37398 4.06673 1.60159 4.70737 0.960955C5.34801 0.320318 6.12039 0 7.02453 0C7.92866 0 8.70105 0.320318 9.34168 0.960955C9.98232 1.60159 10.3026 2.37398 10.3026 3.27811C10.3026 4.1824 9.98232 4.95479 9.34168 5.59527C8.70105 6.23591 7.92866 6.55623 7.02453 6.55623ZM0 13.6889V11.6066C0 11.148 0.124568 10.7233 0.373705 10.3324C0.622841 9.9415 0.955804 9.64101 1.37259 9.4309C2.29827 8.97711 3.23214 8.63673 4.17421 8.40976C5.11628 8.18279 6.06638 8.06931 7.02453 8.06931C7.98267 8.06931 8.93278 8.18279 9.87485 8.40976C10.8169 8.63673 11.7508 8.97711 12.6765 9.4309C13.0933 9.64101 13.4262 9.9415 13.6753 10.3324C13.9245 10.7233 14.0491 11.148 14.0491 11.6066V13.6889H0Z"
        fill="#969696"
      />
    </svg>
  );
};

export const OverviewIcon = ({ className = '' }: IconProps) => {
  return (
    <svg width="16" height="17" viewBox="0 0 16 17" fill="none" className={className}>
      <path
        d="M13.6211 14.1943L14.1457 13.6697L12.5829 12.1069V9.78147H11.8381V12.4114L13.6211 14.1943ZM12.2105 16.0486C11.159 16.0486 10.2646 15.6799 9.52716 14.9425C8.78975 14.2051 8.42105 13.3107 8.42105 12.2592C8.42105 11.2076 8.78975 10.3132 9.52716 9.57579C10.2646 8.83838 11.159 8.46968 12.2105 8.46968C13.262 8.46968 14.1565 8.83838 14.8939 9.57579C15.6313 10.3132 16 11.2076 16 12.2592C16 13.3107 15.6313 14.2051 14.8939 14.9425C14.1565 15.6799 13.262 16.0486 12.2105 16.0486ZM3.15789 4.5181H11.1579V3.25516H3.15789V4.5181ZM6.81937 14.3158H1.52232C1.10239 14.3158 0.743649 14.1671 0.446105 13.8697C0.148702 13.5721 0 13.2134 0 12.7935V1.52232C0 1.10239 0.148702 0.743649 0.446105 0.446105C0.743649 0.148702 1.10239 0 1.52232 0H12.7935C13.2134 0 13.5721 0.148702 13.8697 0.446105C14.1671 0.743649 14.3158 1.10239 14.3158 1.52232V6.84863C13.9735 6.70603 13.6291 6.59775 13.2825 6.52379C12.936 6.44996 12.5787 6.41305 12.2105 6.41305C11.9913 6.41305 11.7813 6.42596 11.5806 6.45179C11.3798 6.47775 11.1795 6.51824 10.9798 6.57326V6.52631H3.15789V7.78947H8.51011C8.17116 8.05502 7.87025 8.35649 7.60737 8.69389C7.34449 9.0313 7.12232 9.39923 6.94084 9.79768H3.15789V11.0606H6.54084C6.49663 11.2497 6.46428 11.4378 6.44379 11.6251C6.4233 11.8124 6.41305 12.0076 6.41305 12.2105C6.41305 12.5711 6.44161 12.9284 6.49874 13.2825C6.556 13.6366 6.66288 13.9811 6.81937 14.3158Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Minus = ({ className }: IconProps) => {
  return (
    <svg className={className} width="12" height="4" viewBox="0 0 12 4" fill="none">
      <path
        d="M4.98182 3.0183L4.96364 1H7L7.01818 3.0183H4.98182ZM0 3.0183V0.981934H12V3.0183H0Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Plus = ({ className }: IconProps) => {
  return (
    <svg className={className} fill="currentColor" width="12" height="4" viewBox="3 3 18 18">
      <path d="M3 13h8v8h2v-8h8v-2h-8V3h-2v8H3z" fill="currentColor"></path>
    </svg>
  );
};

export const DoneIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M9.55325 17.6534L4.21875 12.3189L5.28775 11.2496L9.55325 15.5151L18.7188 6.34961L19.7878 7.41886L9.55325 17.6534Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const PlayCircle = ({ className }: IconProps) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1224_76588)">
        <path
          d="M11.5704 8.28031C12.4662 9.01104 12.9141 9.3764 12.9141 10.0013C12.9141 10.6262 12.4662 10.9916 11.5704 11.7223C11.3231 11.924 11.0779 12.1139 10.8525 12.2722C10.6548 12.411 10.4308 12.5547 10.199 12.6956C9.30534 13.2391 8.8585 13.5108 8.45774 13.21C8.05698 12.9091 8.02056 12.2793 7.94771 11.0198C7.92711 10.6636 7.91406 10.3144 7.91406 10.0013C7.91406 9.68825 7.92711 9.33905 7.94771 8.98284C8.02056 7.72326 8.05698 7.09348 8.45774 6.79263C8.8585 6.49179 9.30534 6.76352 10.199 7.30696C10.4308 7.44794 10.6548 7.59156 10.8525 7.7304C11.0779 7.88866 11.3231 8.07858 11.5704 8.28031Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M5.83073 2.78282C7.05645 2.07378 8.47953 1.66797 9.9974 1.66797C14.5998 1.66797 18.3307 5.39893 18.3307 10.0013C18.3307 14.6037 14.5998 18.3346 9.9974 18.3346C5.39502 18.3346 1.66406 14.6037 1.66406 10.0013C1.66406 8.48344 2.06987 7.06036 2.77891 5.83464"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_76588">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const PlayDottedCircle = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.6504 15.747L15.5254 12.622C15.7588 12.472 15.8754 12.2637 15.8754 11.997C15.8754 11.7303 15.7588 11.522 15.5254 11.372L10.6504 8.24699C10.4004 8.08033 10.1461 8.06766 9.88743 8.20899C9.62876 8.35033 9.49976 8.57133 9.50043 8.87199V15.122C9.50043 15.422 9.62976 15.643 9.88843 15.785C10.1471 15.927 10.4011 15.9143 10.6504 15.747ZM3.02543 12.997C3.30876 12.997 3.5631 13.0887 3.78843 13.272C4.01376 13.4553 4.16776 13.6887 4.25043 13.972C4.35043 14.3553 4.47143 14.718 4.61343 15.06C4.75543 15.402 4.91776 15.7393 5.10043 16.072C5.25043 16.322 5.3131 16.5887 5.28843 16.872C5.26376 17.1553 5.1511 17.397 4.95043 17.597C4.7671 17.7803 4.5421 17.8637 4.27543 17.847C4.00876 17.8303 3.80043 17.7137 3.65043 17.497C3.28376 16.9803 2.97543 16.4263 2.72543 15.835C2.47543 15.2437 2.28376 14.631 2.15043 13.997C2.10043 13.7303 2.1631 13.497 2.33843 13.297C2.51376 13.097 2.74276 12.997 3.02543 12.997ZM4.95043 6.397C5.15043 6.59699 5.25876 6.83866 5.27543 7.12199C5.2921 7.40533 5.23376 7.66366 5.10043 7.897C4.9171 8.23033 4.75476 8.572 4.61343 8.922C4.4721 9.272 4.3511 9.63866 4.25043 10.022C4.1671 10.3053 4.0131 10.5387 3.78843 10.722C3.56376 10.9053 3.30943 10.997 3.02543 10.997C2.74143 10.997 2.51243 10.893 2.33843 10.685C2.16443 10.477 2.1101 10.2393 2.17543 9.972C2.30876 9.33866 2.50043 8.72633 2.75043 8.13499C3.00043 7.54366 3.30043 6.98933 3.65043 6.47199C3.80043 6.25533 4.00876 6.143 4.27543 6.135C4.5421 6.127 4.7671 6.21433 4.95043 6.397ZM6.35043 19.022C6.55043 18.8053 6.79643 18.6887 7.08843 18.672C7.38043 18.6553 7.6511 18.722 7.90043 18.872C8.23376 19.0553 8.57143 19.222 8.91343 19.372C9.25543 19.522 9.60943 19.647 9.97543 19.747C10.2588 19.8303 10.4921 19.9803 10.6754 20.197C10.8588 20.4137 10.9504 20.6637 10.9504 20.947C10.9504 21.2303 10.8464 21.4553 10.6384 21.622C10.4304 21.7887 10.1928 21.847 9.92543 21.797C9.2921 21.6637 8.6961 21.472 8.13743 21.222C7.57876 20.972 7.0331 20.6803 6.50043 20.347C6.2671 20.197 6.1381 19.9887 6.11343 19.722C6.08876 19.4553 6.16776 19.222 6.35043 19.022ZM11.0004 3.047C11.0004 3.33033 10.9131 3.58033 10.7384 3.797C10.5638 4.01366 10.3344 4.16366 10.0504 4.247C9.6671 4.347 9.30043 4.468 8.95043 4.61C8.60043 4.752 8.25876 4.92266 7.92543 5.122C7.67543 5.272 7.40476 5.33466 7.11343 5.31C6.8221 5.28533 6.5761 5.17266 6.37543 4.972C6.17476 4.77133 6.08743 4.534 6.11343 4.26C6.13943 3.986 6.26843 3.77333 6.50043 3.622C7.03376 3.28866 7.5881 3.00133 8.16343 2.76C8.73876 2.51866 9.34243 2.331 9.97443 2.197C10.2411 2.147 10.4788 2.20533 10.6874 2.372C10.8961 2.53866 11.0004 2.76366 11.0004 3.047ZM20.0004 11.997C20.0004 10.1137 19.4214 8.45099 18.2634 7.009C17.1054 5.567 15.6261 4.62966 13.8254 4.197C13.5754 4.13033 13.3754 3.98866 13.2254 3.772C13.0754 3.55533 13.0004 3.31366 13.0004 3.047C13.0004 2.78033 13.0921 2.55966 13.2754 2.385C13.4588 2.21033 13.6671 2.14766 13.9004 2.197C16.2338 2.66366 18.1671 3.80533 19.7004 5.622C21.2338 7.43866 22.0004 9.56366 22.0004 11.997C22.0004 14.4303 21.2338 16.5553 19.7004 18.372C18.1671 20.1887 16.2338 21.3303 13.9004 21.797C13.6671 21.847 13.4588 21.7847 13.2754 21.61C13.0921 21.4353 13.0004 21.2143 13.0004 20.947C13.0004 20.6797 13.0754 20.438 13.2254 20.222C13.3754 20.006 13.5754 19.8643 13.8254 19.797C15.6254 19.3637 17.1048 18.4263 18.2634 16.985C19.4221 15.5437 20.0011 13.881 20.0004 11.997Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const AddCardIcon = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        opacity="0.4"
        d="M19.6007 12.6068H21.5669V11.2052C21.5669 9.19038 19.9219 7.54541 17.9071 7.54541H6.73304C4.71821 7.54541 3.07324 9.19038 3.07324 11.2052V15.4588C3.74485 14.9234 4.59167 14.6022 5.50662 14.6022C7.65773 14.6022 9.40002 16.3445 9.40002 18.4956C9.40002 19.2256 9.19562 19.9167 8.83548 20.5007C8.63107 20.8511 8.36827 21.1626 8.06653 21.4157H17.9071C19.9219 21.4157 21.5669 19.7707 21.5669 17.7559V16.5976H19.7175C18.6663 16.5976 17.7027 15.8286 17.6151 14.7774C17.5567 14.1642 17.7903 13.5899 18.1991 13.1908C18.5593 12.821 19.0557 12.6068 19.6007 12.6068Z"
        fill="currentColor"
      ></path>
      <path
        d="M15.0941 3.84673V7.54546H6.73304C4.71821 7.54546 3.07324 9.19043 3.07324 11.2053V7.63308C3.07324 6.4748 3.78378 5.443 4.8642 5.03419L12.5926 2.11414C13.7996 1.6664 15.0941 2.55218 15.0941 3.84673Z"
        fill="currentColor"
      ></path>
      <path
        d="M22.5999 13.5997V15.6049C22.5999 16.1402 22.1716 16.5782 21.6265 16.5976H19.7187C18.6675 16.5976 17.7039 15.8287 17.6163 14.7775C17.5579 14.1643 17.7915 13.59 18.2003 13.1909C18.5605 12.821 19.0569 12.6069 19.6019 12.6069H21.6265C22.1716 12.6264 22.5999 13.0644 22.5999 13.5997Z"
        fill="currentColor"
      ></path>
      <path
        d="M14.2671 12.4122H7.45365C7.05457 12.4122 6.72363 12.0812 6.72363 11.6822C6.72363 11.2831 7.05457 10.9521 7.45365 10.9521H14.2671C14.6662 10.9521 14.9971 11.2831 14.9971 11.6822C14.9971 12.0812 14.6662 12.4122 14.2671 12.4122Z"
        fill="currentColor"
      ></path>
      <path
        d="M8.25989 15.7428C7.61292 15.0958 6.787 14.7242 5.93356 14.6278C4.79792 14.497 3.621 14.8756 2.75378 15.7428C2.23759 16.259 1.89346 16.8922 1.73516 17.5598C1.41167 18.8331 1.74892 20.244 2.75378 21.2489C3.44893 21.944 4.33679 22.3226 5.25218 22.3708C5.64449 22.4052 6.05056 22.3708 6.44287 22.2675C7.11049 22.1092 7.74369 21.7651 8.25989 21.2489C9.78095 19.7278 9.78095 17.2639 8.25989 15.7428ZM4.79103 17.0367C4.79103 16.6376 5.12139 16.3072 5.52058 16.3072C5.92666 16.3141 6.25014 16.6376 6.25702 17.0436L6.25017 17.7663L6.94532 17.7594C7.35139 17.7663 7.67488 18.0898 7.68176 18.4958C7.67488 18.9019 7.35139 19.2254 6.94531 19.2323L6.25017 19.2254L6.25703 19.9481C6.25015 20.3542 5.92666 20.6777 5.52059 20.6845C5.32099 20.6777 5.14207 20.595 5.0113 20.4643C4.88053 20.3335 4.79791 20.1546 4.79103 19.955L4.79105 19.2254L4.03397 19.2254C3.82749 19.2254 3.64852 19.1428 3.51775 19.0121C3.38698 18.8813 3.30441 18.7023 3.30441 18.4958C3.30441 18.0966 3.63478 17.7663 4.03397 17.7663L4.79105 17.7663L4.79103 17.0367Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const VerifiedCheck = ({ className }: IconProps) => {
  return (
    <svg width={'24'} height={'24'} viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.5924 3.20027C9.34888 3.4078 9.22711 3.51158 9.09706 3.59874C8.79896 3.79854 8.46417 3.93721 8.1121 4.00672C7.95851 4.03705 7.79903 4.04977 7.48008 4.07522C6.6787 4.13918 6.278 4.17115 5.94371 4.28923C5.17051 4.56233 4.56233 5.17051 4.28923 5.94371C4.17115 6.278 4.13918 6.6787 4.07522 7.48008C4.04977 7.79903 4.03705 7.95851 4.00672 8.1121C3.93721 8.46417 3.79854 8.79896 3.59874 9.09706C3.51158 9.22711 3.40781 9.34887 3.20027 9.5924C2.67883 10.2043 2.4181 10.5102 2.26522 10.8301C1.91159 11.57 1.91159 12.43 2.26522 13.1699C2.41811 13.4898 2.67883 13.7957 3.20027 14.4076C3.40778 14.6511 3.51158 14.7729 3.59874 14.9029C3.79854 15.201 3.93721 15.5358 4.00672 15.8879C4.03705 16.0415 4.04977 16.201 4.07522 16.5199C4.13918 17.3213 4.17115 17.722 4.28923 18.0563C4.56233 18.8295 5.17051 19.4377 5.94371 19.7108C6.278 19.8288 6.6787 19.8608 7.48008 19.9248C7.79903 19.9502 7.95851 19.963 8.1121 19.9933C8.46417 20.0628 8.79896 20.2015 9.09706 20.4013C9.22711 20.4884 9.34887 20.5922 9.5924 20.7997C10.2043 21.3212 10.5102 21.5819 10.8301 21.7348C11.57 22.0884 12.43 22.0884 13.1699 21.7348C13.4898 21.5819 13.7957 21.3212 14.4076 20.7997C14.6511 20.5922 14.7729 20.4884 14.9029 20.4013C15.201 20.2015 15.5358 20.0628 15.8879 19.9933C16.0415 19.963 16.201 19.9502 16.5199 19.9248C17.3213 19.8608 17.722 19.8288 18.0563 19.7108C18.8295 19.4377 19.4377 18.8295 19.7108 18.0563C19.8288 17.722 19.8608 17.3213 19.9248 16.5199C19.9502 16.201 19.963 16.0415 19.9933 15.8879C20.0628 15.5358 20.2015 15.201 20.4013 14.9029C20.4884 14.7729 20.5922 14.6511 20.7997 14.4076C21.3212 13.7957 21.5819 13.4898 21.7348 13.1699C22.0884 12.43 22.0884 11.57 21.7348 10.8301C21.5819 10.5102 21.3212 10.2043 20.7997 9.5924C20.5922 9.34887 20.4884 9.22711 20.4013 9.09706C20.2015 8.79896 20.0628 8.46417 19.9933 8.1121C19.963 7.95851 19.9502 7.79903 19.9248 7.48008C19.8608 6.6787 19.8288 6.278 19.7108 5.94371C19.4377 5.17051 18.8295 4.56233 18.0563 4.28923C17.722 4.17115 17.3213 4.13918 16.5199 4.07522C16.201 4.04977 16.0415 4.03705 15.8879 4.00672C15.5358 3.93721 15.201 3.79854 14.9029 3.59874C14.7729 3.51158 14.6511 3.40781 14.4076 3.20027C13.7957 2.67883 13.4898 2.41811 13.1699 2.26522C12.43 1.91159 11.57 1.91159 10.8301 2.26522C10.5102 2.4181 10.2043 2.67883 9.5924 3.20027ZM16.3735 9.86314C16.6913 9.5453 16.6913 9.03 16.3735 8.71216C16.0557 8.39433 15.5403 8.39433 15.2225 8.71216L10.3723 13.5624L8.77746 11.9676C8.45963 11.6498 7.94432 11.6498 7.62649 11.9676C7.30866 12.2854 7.30866 12.8007 7.62649 13.1186L9.79678 15.2889C10.1146 15.6067 10.6299 15.6067 10.9478 15.2889L16.3735 9.86314Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const ChevronIcon = ({ className = '' }: IconProps) => {
  return (
    <svg
      className={`${className}`}
      width={'20'}
      height={'20'}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      data-slot="icon"
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const CallRingIcon = ({ className = '' }: any) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M16.5562 12.9062L16.1007 13.359C16.1007 13.359 15.0181 14.4355 12.0631 11.4972C9.10812 8.55901 10.1907 7.48257 10.1907 7.48257L10.4775 7.19738C11.1841 6.49484 11.2507 5.36691 10.6342 4.54348L9.37326 2.85908C8.61028 1.83992 7.13596 1.70529 6.26145 2.57483L4.69185 4.13552C4.25823 4.56668 3.96765 5.12559 4.00289 5.74561C4.09304 7.33182 4.81071 10.7447 8.81536 14.7266C13.0621 18.9492 17.0468 19.117 18.6763 18.9651C19.1917 18.9171 19.6399 18.6546 20.0011 18.2954L21.4217 16.883C22.3806 15.9295 22.1102 14.2949 20.8833 13.628L18.9728 12.5894C18.1672 12.1515 17.1858 12.2801 16.5562 12.9062Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const CutCallIcon = ({ className = '' }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M8 13.4783L8 12.8618C8 12.8618 8 11.3964 12 11.3964C16 11.3964 16 12.8618 16 12.8618V13.2501C16 14.2065 16.7227 15.0193 17.7004 15.1626L19.7004 15.4557C20.9105 15.633 22 14.7268 22 13.5431V11.4184C22 10.8314 21.8162 10.2543 21.3703 9.85613C20.2296 8.83744 17.4208 7.00012 12 7.00012C6.25141 7.00012 3.44027 9.58281 2.44083 10.789C2.1247 11.1706 2 11.6526 2 12.1416L2 14.0645C2 15.3625 3.29561 16.2921 4.57997 15.9157L6.57997 15.3296C7.42329 15.0824 8 14.3306 8 13.4783Z"
          fill="white"
        />
      </g>
    </svg>
  );
};

export const Message = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_615_13438)">
        <path
          d="M2 9C2 4.58172 5.58172 1 10 1H30C34.4183 1 38 4.58172 38 9V29C38 33.4183 34.4183 37 30 37H10C5.58172 37 2 33.4183 2 29V9Z"
          fill="white"
        />
        <path
          d="M2.5 9C2.5 4.85786 5.85786 1.5 10 1.5H30C34.1421 1.5 37.5 4.85786 37.5 9V29C37.5 33.1421 34.1421 36.5 30 36.5H10C5.85786 36.5 2.5 33.1421 2.5 29V9Z"
          stroke="#D0D5DD"
        />
        <g>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12.6429 13.3096C11.6666 14.2859 11.6666 15.8573 11.6666 19C11.6666 22.1427 11.6666 23.714 12.6429 24.6903C13.6192 25.6666 15.1906 25.6666 18.3333 25.6666H21.6666C24.8093 25.6666 26.3807 25.6666 27.357 24.6903C28.3333 23.714 28.3333 22.1427 28.3333 19C28.3333 15.8573 28.3333 14.2859 27.357 13.3096C26.3807 12.3333 24.8093 12.3333 21.6666 12.3333H18.3333C15.1906 12.3333 13.6192 12.3333 12.6429 13.3096ZM25.4801 15.2665C25.7011 15.5317 25.6652 15.9258 25.4001 16.1468L23.5697 17.6721C22.831 18.2877 22.2324 18.7866 21.704 19.1264C21.1536 19.4804 20.6175 19.704 20 19.704C19.3824 19.704 18.8464 19.4804 18.2959 19.1264C17.7676 18.7866 17.1689 18.2877 16.4303 17.6721L14.5998 16.1468C14.3347 15.9258 14.2988 15.5317 14.5198 15.2665C14.7408 15.0014 15.1349 14.9655 15.4001 15.1865L17.1992 16.6857C17.9766 17.3336 18.5164 17.782 18.9721 18.0751C19.4132 18.3588 19.7124 18.454 20 18.454C20.2875 18.454 20.5867 18.3588 21.0278 18.0751C21.4835 17.782 22.0233 17.3336 22.8008 16.6857L24.5998 15.1865C24.865 14.9655 25.2591 15.0014 25.4801 15.2665Z"
            fill="#344054"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_615_13438"
          x="0"
          y="0"
          width="20"
          height="20"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.05 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_615_13438" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_615_13438"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const Unread = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g>
        <path
          d="M14.6693 6.66797C14.6816 7.15268 14.6693 7.37079 14.6693 8.0013C14.6693 10.5155 14.6693 11.7725 13.8882 12.5536C13.1072 13.3346 11.8501 13.3346 9.33594 13.3346H6.66927C4.15511 13.3346 2.89803 13.3346 2.11699 12.5536C1.33594 11.7725 1.33594 10.5155 1.33594 8.0013C1.33594 5.48714 1.33594 4.23007 2.11699 3.44902C2.89803 2.66797 4.15511 2.66797 6.66927 2.66797H8.66927"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M4 5.33203L5.43926 6.53142C6.66369 7.55177 7.2759 8.06195 8 8.06195C8.7241 8.06195 9.33631 7.55177 10.5607 6.53142"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="12.6641" cy="3.33203" r="2" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export const MessageIcon = ({ className = '' }: IconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 2.71967C0 1.99837 0.26866 1.30661 0.746878 0.796574C1.2251 0.286536 1.8737 0 2.55 0H14.45C15.1263 0 15.7749 0.286536 16.2531 0.796574C16.7313 1.30661 17 1.99837 17 2.71967V11.7853C17 12.5066 16.7313 13.1983 16.2531 13.7084C15.7749 14.2184 15.1263 14.5049 14.45 14.5049H7.93305L5.1 16.7713C4.3996 17.3316 3.4 16.7985 3.4 15.8648V14.5049H2.55C1.8737 14.5049 1.2251 14.2184 0.746878 13.7084C0.26866 13.1983 0 12.5066 0 11.7853V2.71967ZM2.55 1.81312C2.32457 1.81312 2.10837 1.90863 1.94896 2.07864C1.78955 2.24865 1.7 2.47924 1.7 2.71967V11.7853C1.7 12.0257 1.78955 12.2563 1.94896 12.4263C2.10837 12.5963 2.32457 12.6918 2.55 12.6918H3.825C4.16315 12.6918 4.48745 12.8351 4.72656 13.0901C4.96567 13.3451 5.1 13.691 5.1 14.0517V14.5049L6.91305 13.0544C7.20731 12.8191 7.56522 12.6918 7.93305 12.6918H14.45C14.6754 12.6918 14.8916 12.5963 15.051 12.4263C15.2104 12.2563 15.3 12.0257 15.3 11.7853V2.71967C15.3 2.47924 15.2104 2.24865 15.051 2.07864C14.8916 1.90863 14.6754 1.81312 14.45 1.81312H2.55Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ChevronUp = () => {
  return (
    <svg
      className="h-5 w-5 flex-none text-gray-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      data-slot="icon"
    >
      <path
        fillRule="evenodd"
        d="M14.78 11.78a.75.75 0 0 1-1.06 0L10 7.06 6.28 11.78a.75.75 0 1 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
};

export const GoogleDrive = ({ className }: IconProps) => {
  return (
    <svg
      width="32"
      height="33"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_d_673_9001)">
        <path
          d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z"
          fill="white"
        />
        <path
          d="M16.0022 12.4509L12.5413 6.34322C12.6562 6.22622 12.7884 6.14948 12.9206 6.0979C11.9 6.43379 11.4317 7.57986 11.4317 7.57986L5.1092 18.7348C5.02023 19.0845 4.99552 19.4003 5.00664 19.6783H11.9074L16.0022 12.4509Z"
          fill="#34A853"
        />
        <path
          d="M16.002 12.4509L20.0967 19.6783H26.9975C27.0086 19.4003 26.9839 19.0845 26.8949 18.7348L20.5724 7.57986C20.5724 7.57986 20.1029 6.43379 19.0835 6.0979C19.2145 6.14948 19.3479 6.22622 19.4628 6.34322L16.002 12.4509Z"
          fill="#FBBC05"
        />
        <path
          d="M16.0019 12.4512L19.4628 6.34346C19.3479 6.22646 19.2144 6.14973 19.0835 6.09815C18.9327 6.04908 18.7709 6.01637 18.5954 6.00757H18.4125H13.5913H13.4084C13.2342 6.01512 13.0711 6.04783 12.9203 6.09815C12.7894 6.14973 12.6559 6.22646 12.541 6.34346L16.0019 12.4512Z"
          fill="#188038"
        />
        <path
          d="M11.9085 19.6782L8.48712 25.7168C8.48712 25.7168 8.37344 25.6614 8.21899 25.5469C8.70458 25.9206 9.17658 25.9998 9.17658 25.9998H22.6136C23.355 25.9998 23.5094 25.7168 23.5094 25.7168C23.5119 25.7155 23.5131 25.7142 23.5156 25.713L20.0967 19.6782H11.9085Z"
          fill="#4285F4"
        />
        <path
          d="M11.9086 19.6782H5.00781C5.04241 20.4985 5.39826 20.9778 5.39826 20.9778L5.65773 21.4281C5.67627 21.4546 5.68739 21.4697 5.68739 21.4697L6.25205 22.461L7.51976 24.6676C7.55683 24.7569 7.60008 24.8386 7.6458 24.9166C7.66309 24.9431 7.67915 24.972 7.69769 24.9972C7.70263 25.0047 7.70757 25.0123 7.71252 25.0198C7.86944 25.2412 8.04489 25.4123 8.22034 25.5469C8.37479 25.6627 8.48847 25.7168 8.48847 25.7168L11.9086 19.6782Z"
          fill="#1967D2"
        />
        <path
          d="M20.0967 19.6782H26.9974C26.9628 20.4985 26.607 20.9778 26.607 20.9778L26.3475 21.4281C26.329 21.4546 26.3179 21.4697 26.3179 21.4697L25.7532 22.461L24.4855 24.6676C24.4484 24.7569 24.4052 24.8386 24.3595 24.9166C24.3422 24.9431 24.3261 24.972 24.3076 24.9972C24.3026 25.0047 24.2977 25.0123 24.2927 25.0198C24.1358 25.2412 23.9604 25.4123 23.7849 25.5469C23.6305 25.6627 23.5168 25.7168 23.5168 25.7168L20.0967 19.6782Z"
          fill="#EA4335"
        />
      </g>
      <defs>
        <filter
          id="filter0_d_673_9001"
          x="-2"
          y="-1"
          width="36"
          height="36"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.05 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_673_9001" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_673_9001"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const Google = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18.7509 10.1944C18.7509 9.47495 18.6913 8.94995 18.5624 8.40552H10.1794V11.6527H15.1C15.0009 12.4597 14.4652 13.675 13.2747 14.4916L13.258 14.6003L15.9085 16.6126L16.0921 16.6305C17.7786 15.1041 18.7509 12.8583 18.7509 10.1944Z"
        fill="#4285F4"
      />
      <path
        d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
        fill="#34A853"
      />
      <path
        d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
        fill="#FBBC05"
      />
      <path
        d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26944C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
        fill="#EB4335"
      />
    </svg>
  );
};

export const Delete = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M13.6666 4H2.33325"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12.5556 5.66675L12.2489 10.2662C12.1309 12.0361 12.0719 12.9211 11.4953 13.4606C10.9186 14.0001 10.0317 14.0001 8.2578 14.0001H7.74223C5.96836 14.0001 5.08142 14.0001 4.50475 13.4606C3.92808 12.9211 3.86908 12.0361 3.75109 10.2662L3.44446 5.66675"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6.11377 2.66659C6.38833 1.88979 7.12915 1.33325 7.99997 1.33325C8.87078 1.33325 9.6116 1.88979 9.88616 2.66659"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const RemoveIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2.25 4.78948C2.25 4.42614 2.50904 4.13159 2.82857 4.13159L4.82675 4.13124C5.22377 4.1198 5.57401 3.83275 5.7091 3.40809C5.71266 3.39692 5.71674 3.38315 5.73139 3.33318L5.81749 3.03942C5.87018 2.8593 5.91608 2.70239 5.98031 2.56213C6.23407 2.00802 6.70356 1.62324 7.2461 1.52473C7.38343 1.49979 7.52886 1.4999 7.69579 1.50002H10.3043C10.4713 1.4999 10.6167 1.49979 10.754 1.52473C11.2966 1.62324 11.7661 2.00802 12.0198 2.56213C12.0841 2.70239 12.13 2.8593 12.1826 3.03942L12.2687 3.33318C12.2834 3.38315 12.2875 3.39692 12.291 3.40809C12.4261 3.83275 12.8458 4.12015 13.2429 4.13159H15.1714C15.491 4.13159 15.75 4.42614 15.75 4.78948C15.75 5.15282 15.491 5.44737 15.1714 5.44737H2.82857C2.50904 5.44737 2.25 5.15282 2.25 4.78948Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.6967 16.5001H9.3033C11.3903 16.5001 12.4339 16.5001 13.1123 15.8356C13.7908 15.1712 13.8602 14.0813 13.9991 11.9015L14.1991 8.76055C14.2744 7.5778 14.3121 6.98643 13.9717 6.61168C13.6313 6.23694 13.0565 6.23694 11.907 6.23694H6.09303C4.94345 6.23694 4.36866 6.23694 4.02829 6.61168C3.68792 6.98643 3.72558 7.5778 3.80091 8.76055L4.00094 11.9015C4.13977 14.0813 4.20919 15.1712 4.88767 15.8356C5.56615 16.5001 6.60967 16.5001 8.6967 16.5001ZM7.68471 9.14145C7.6538 8.81607 7.37815 8.57867 7.06903 8.6112C6.75991 8.64374 6.53438 8.9339 6.56529 9.25929L6.94029 13.2067C6.9712 13.532 7.24685 13.7694 7.55597 13.7369C7.86509 13.7044 8.09062 13.4142 8.05971 13.0888L7.68471 9.14145ZM10.931 8.6112C11.2401 8.64374 11.4656 8.9339 11.4347 9.25929L11.0597 13.2067C11.0288 13.532 10.7531 13.7694 10.444 13.7369C10.1349 13.7044 9.90938 13.4142 9.94029 13.0888L10.3153 9.14145C10.3462 8.81607 10.6219 8.57867 10.931 8.6112Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Reminder = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M12.4994 6.47296V6.00323C12.4994 3.42407 10.485 1.33325 8 1.33325C5.51504 1.33325 3.50058 3.42407 3.50058 6.00323V6.47296C3.50058 7.03669 3.33981 7.5878 3.03853 8.05685L2.30024 9.20627C1.62588 10.2561 2.1407 11.6832 3.31357 12.0152C6.38183 12.8837 9.61817 12.8837 12.6864 12.0152C13.8593 11.6832 14.3741 10.2561 13.6998 9.20627L12.9615 8.05685C12.6602 7.5878 12.4994 7.03669 12.4994 6.47296Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path
          d="M5 12.6667C5.43668 13.8319 6.61497 14.6667 8 14.6667C9.38503 14.6667 10.5633 13.8319 11 12.6667"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export const Pin = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M2.66663 6.76211C2.66663 3.76384 5.05444 1.33325 7.99996 1.33325C10.9455 1.33325 13.3333 3.76384 13.3333 6.76211C13.3333 9.7369 11.6311 13.2082 8.97525 14.4496C8.35613 14.7389 7.64379 14.7389 7.02467 14.4496C4.36884 13.2082 2.66663 9.7369 2.66663 6.76211Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <ellipse cx="8" cy="6.66675" rx="2" ry="2" stroke="#1C274C" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export const CreateNewFolder = ({ className = '' }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1202_20625)">
        <path
          d="M6.66406 9.33333H7.9974M7.9974 9.33333H9.33073M7.9974 9.33333V10.6667M7.9974 9.33333V8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.33594 4.63186C1.33594 4.04351 1.33594 3.74933 1.38217 3.50429C1.5857 2.42557 2.42948 1.58179 3.50819 1.37826C3.75324 1.33203 4.04742 1.33203 4.63577 1.33203C4.89355 1.33203 5.02245 1.33203 5.14632 1.34361C5.68037 1.39356 6.18695 1.60339 6.5999 1.94571C6.69568 2.02511 6.78682 2.11625 6.9691 2.29853L7.33594 2.66537C7.87979 3.20922 8.15172 3.48114 8.47735 3.66231C8.65623 3.76184 8.84598 3.84043 9.04284 3.89655C9.4012 3.9987 9.78576 3.9987 10.5549 3.9987H10.804C12.5589 3.9987 13.4364 3.9987 14.0067 4.51167C14.0592 4.55886 14.1091 4.60879 14.1563 4.66125C14.6693 5.2316 14.6693 6.10906 14.6693 7.86397V9.33203C14.6693 11.8462 14.6693 13.1033 13.8882 13.8843C13.1072 14.6654 11.8501 14.6654 9.33594 14.6654H6.66927C4.15511 14.6654 2.89803 14.6654 2.11699 13.8843C1.33594 13.1033 1.33594 11.8462 1.33594 9.33203V4.63186Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_1202_20625">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const Bookmark = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M14 10.7272V7.39826C14 4.53919 14 3.10965 13.1213 2.22145C12.2426 1.33325 10.8284 1.33325 8 1.33325C5.17157 1.33325 3.75736 1.33325 2.87868 2.22145C2 3.10965 2 4.53919 2 7.39826V10.7272C2 12.7916 2 13.8238 2.4894 14.2748C2.72281 14.4899 3.01743 14.625 3.33128 14.6609C3.98935 14.7362 4.75782 14.0565 6.29477 12.6971C6.97415 12.0962 7.31383 11.7958 7.70685 11.7166C7.90038 11.6776 8.09962 11.6776 8.29315 11.7166C8.68617 11.7958 9.02585 12.0962 9.70523 12.6971C11.2422 14.0565 12.0107 14.7362 12.6687 14.6609C12.9826 14.625 13.2772 14.4899 13.5106 14.2748C14 13.8238 14 12.7916 14 10.7272Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M10 4H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
};

export const AddIcon = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.00004 14.6666C11.6819 14.6666 14.6667 11.6818 14.6667 7.99992C14.6667 4.31802 11.6819 1.33325 8.00004 1.33325C4.31814 1.33325 1.33337 4.31802 1.33337 7.99992C1.33337 11.6818 4.31814 14.6666 8.00004 14.6666ZM8.50004 5.99992C8.50004 5.72378 8.27618 5.49992 8.00004 5.49992C7.7239 5.49992 7.50004 5.72378 7.50004 5.99992L7.50004 7.49994H6.00004C5.7239 7.49994 5.50004 7.72379 5.50004 7.99994C5.50004 8.27608 5.7239 8.49994 6.00004 8.49994H7.50004V9.99992C7.50004 10.2761 7.7239 10.4999 8.00004 10.4999C8.27618 10.4999 8.50004 10.2761 8.50004 9.99992L8.50004 8.49994H10C10.2762 8.49994 10.5 8.27608 10.5 7.99994C10.5 7.72379 10.2762 7.49994 10 7.49994H8.50004V5.99992Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const WhatsappIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 15.5C11.866 15.5 15 12.366 15 8.5C15 4.63401 11.866 1.5 8 1.5C4.13401 1.5 1 4.63401 1 8.5C1 9.75544 1.3305 10.9337 1.90924 11.9525L1 15.5L4.65743 14.6519C5.65069 15.1927 6.78946 15.5 8 15.5ZM8 14.4231C11.2712 14.4231 13.9231 11.7712 13.9231 8.5C13.9231 5.22878 11.2712 2.57692 8 2.57692C4.72878 2.57692 2.07692 5.22878 2.07692 8.5C2.07692 9.76303 2.47225 10.9337 3.14592 11.8951L2.61538 13.8846L4.63997 13.3785C5.59468 14.0373 6.75229 14.4231 8 14.4231Z"
        fill="#BFC8D0"
      />
      <path
        d="M14 8C14 11.3137 11.3137 14 8 14C6.73608 14 5.56344 13.6092 4.59633 12.9418L2.54545 13.4545L3.08288 11.4392C2.40046 10.4653 2 9.27944 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
        fill="url(#paint0_linear_1028_10600)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 9.25544 1.3305 10.4337 1.90924 11.4525L1 15L4.65743 14.1519C5.65069 14.6927 6.78946 15 8 15ZM8 13.9231C11.2712 13.9231 13.9231 11.2712 13.9231 8C13.9231 4.72878 11.2712 2.07692 8 2.07692C4.72878 2.07692 2.07692 4.72878 2.07692 8C2.07692 9.26303 2.47225 10.4337 3.14592 11.3951L2.61538 13.3846L4.63997 12.8785C5.59468 13.5373 6.75229 13.9231 8 13.9231Z"
        fill="white"
      />
      <path
        d="M6.25001 4.74994C6.08358 4.41565 5.82826 4.44525 5.57034 4.44525C5.10938 4.44525 4.39062 4.99739 4.39062 6.02498C4.39063 6.86714 4.76172 7.78901 6.01221 9.16806C7.21902 10.4989 8.80469 11.1874 10.1211 11.164C11.4375 11.1405 11.7083 10.0077 11.7083 9.62516C11.7083 9.4556 11.6031 9.371 11.5306 9.34801C11.082 9.13272 10.2547 8.73157 10.0664 8.6562C9.87816 8.58083 9.77986 8.68278 9.71876 8.73823C9.54804 8.90092 9.20963 9.38039 9.09376 9.48823C8.97789 9.59608 8.80514 9.5415 8.73325 9.50073C8.46872 9.39458 7.75146 9.07554 7.17973 8.52131C6.47266 7.83589 6.43116 7.60007 6.29795 7.39015C6.19138 7.22222 6.26958 7.11919 6.3086 7.07416C6.46095 6.89838 6.6713 6.62699 6.76564 6.49213C6.85997 6.35727 6.78508 6.15251 6.74015 6.02498C6.54689 5.47651 6.38316 5.01737 6.25001 4.74994Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1028_10600"
          x1="13.25"
          y1="3.5"
          x2="2"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#5BD066" />
          <stop offset="1" stop-color="#27B43E" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const Instagram = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="1" y="1" width="14" height="14" rx="6" fill="url(#paint0_radial_1028_10544)" />
      <rect x="1" y="1" width="14" height="14" rx="6" fill="url(#paint1_radial_1028_10544)" />
      <rect x="1" y="1" width="14" height="14" rx="6" fill="url(#paint2_radial_1028_10544)" />
      <path
        d="M11.5 5.25C11.5 5.66421 11.1642 6 10.75 6C10.3358 6 10 5.66421 10 5.25C10 4.83579 10.3358 4.5 10.75 4.5C11.1642 4.5 11.5 4.83579 11.5 5.25Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 10.5C9.38071 10.5 10.5 9.38071 10.5 8C10.5 6.61929 9.38071 5.5 8 5.5C6.61929 5.5 5.5 6.61929 5.5 8C5.5 9.38071 6.61929 10.5 8 10.5ZM8 9.5C8.82843 9.5 9.5 8.82843 9.5 8C9.5 7.17157 8.82843 6.5 8 6.5C7.17157 6.5 6.5 7.17157 6.5 8C6.5 8.82843 7.17157 9.5 8 9.5Z"
        fill="white"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H8.2C9.88016 3 10.7202 3 11.362 3.32698C11.9265 3.6146 12.3854 4.07354 12.673 4.63803C13 5.27976 13 6.11984 13 7.8V8.2C13 9.88016 13 10.7202 12.673 11.362C12.3854 11.9265 11.9265 12.3854 11.362 12.673C10.7202 13 9.88016 13 8.2 13H7.8C6.11984 13 5.27976 13 4.63803 12.673C4.07354 12.3854 3.6146 11.9265 3.32698 11.362C3 10.7202 3 9.88016 3 8.2V7.8ZM7.8 4H8.2C9.05658 4 9.63887 4.00078 10.089 4.03755C10.5274 4.07337 10.7516 4.1383 10.908 4.21799C11.2843 4.40973 11.5903 4.71569 11.782 5.09202C11.8617 5.24842 11.9266 5.47262 11.9624 5.91104C11.9992 6.36113 12 6.94342 12 7.8V8.2C12 9.05658 11.9992 9.63887 11.9624 10.089C11.9266 10.5274 11.8617 10.7516 11.782 10.908C11.5903 11.2843 11.2843 11.5903 10.908 11.782C10.7516 11.8617 10.5274 11.9266 10.089 11.9624C9.63887 11.9992 9.05658 12 8.2 12H7.8C6.94342 12 6.36113 11.9992 5.91104 11.9624C5.47262 11.9266 5.24842 11.8617 5.09202 11.782C4.71569 11.5903 4.40973 11.2843 4.21799 10.908C4.1383 10.7516 4.07337 10.5274 4.03755 10.089C4.00078 9.63887 4 9.05658 4 8.2V7.8C4 6.94342 4.00078 6.36113 4.03755 5.91104C4.07337 5.47262 4.1383 5.24842 4.21799 5.09202C4.40973 4.71569 4.71569 4.40973 5.09202 4.21799C5.24842 4.1383 5.47262 4.07337 5.91104 4.03755C6.36113 4.00078 6.94342 4 7.8 4Z"
        fill="white"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1028_10544"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(6 11.5) rotate(-55.3758) scale(12.7598)"
        >
          <stop stop-color="#B13589" />
          <stop offset="0.79309" stop-color="#C62F94" />
          <stop offset="1" stop-color="#8A3AC8" />
        </radialGradient>
        <radialGradient
          id="paint1_radial_1028_10544"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(5.5 15.5) rotate(-65.1363) scale(11.2971)"
        >
          <stop stop-color="#E0E8B7" />
          <stop offset="0.444662" stop-color="#FB8A2E" />
          <stop offset="0.71474" stop-color="#E2425C" />
          <stop offset="1" stop-color="#E2425C" stop-opacity="0" />
        </radialGradient>
        <radialGradient
          id="paint2_radial_1028_10544"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(0.250001 1.5) rotate(-8.1301) scale(19.4454 4.15918)"
        >
          <stop offset="0.156701" stop-color="#406ADC" />
          <stop offset="0.467799" stop-color="#6A45BE" />
          <stop offset="1" stop-color="#6A45BE" stop-opacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export const Messanger = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 14.0896C11.5899 14.0896 14.5 11.2713 14.5 7.79479C14.5 4.31827 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.31827 1.5 7.79479C1.5 9.6856 2.36084 11.3817 3.72368 12.5356V13.8094C3.72368 14.3073 4.2308 14.6412 4.68294 14.441L6.09649 13.8154C6.69852 13.9936 7.33769 14.0896 8 14.0896Z"
        fill="url(#paint0_linear_1028_10104)"
      />
      <path
        d="M6.4435 6.45666L4.55862 9.03447C4.35652 9.31087 4.71997 9.6429 4.99667 9.43467L6.60614 8.22344C6.76996 8.10015 6.99961 8.09849 7.16535 8.21939L8.59676 9.2636C8.87127 9.46386 9.2636 9.40626 9.46347 9.13637L11.4402 6.46704C11.6453 6.1902 11.279 5.85547 11.0019 6.06642L9.30032 7.3618C9.13646 7.48654 8.90559 7.48883 8.73909 7.36737L7.31233 6.32655C7.03667 6.12546 6.64252 6.18449 6.4435 6.45666Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_1028_10104"
          x1="8"
          y1="1.5"
          x2="5.91431"
          y2="14.4292"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#00B1FF" />
          <stop offset="1" stop-color="#006BFF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const WebChat = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M14.6666 5.66659C14.6666 3.27335 12.7265 1.33325 10.3333 1.33325C8.94467 1.33325 7.70864 1.98812 6.91559 3.00472C10.298 3.13549 12.9999 5.91884 12.9999 9.33325C12.9999 9.40679 12.9987 9.48004 12.9962 9.55298L13.2177 9.61224C13.8619 9.78462 14.4513 9.19524 14.2789 8.55102L14.194 8.23366C14.1254 7.9773 14.1666 7.70646 14.2769 7.46507C14.5271 6.91724 14.6666 6.3082 14.6666 5.66659Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.9999 9.33325C11.9999 12.2788 9.6121 14.6666 6.66659 14.6666C5.84292 14.6666 5.06285 14.4799 4.36642 14.1465C4.12706 14.0319 3.85587 13.9916 3.59951 14.0602L2.78215 14.2789C2.13793 14.4513 1.54855 13.8619 1.72093 13.2177L1.93962 12.4003C2.00822 12.144 1.96798 11.8728 1.85339 11.6334C1.51997 10.937 1.33325 10.1569 1.33325 9.33325C1.33325 6.38773 3.72107 3.99992 6.66659 3.99992C9.6121 3.99992 11.9999 6.38773 11.9999 9.33325ZM4.33325 9.99992C4.70144 9.99992 4.99992 9.70144 4.99992 9.33325C4.99992 8.96506 4.70144 8.66659 4.33325 8.66659C3.96506 8.66659 3.66659 8.96506 3.66659 9.33325C3.66659 9.70144 3.96506 9.99992 4.33325 9.99992ZM6.66659 9.99992C7.03478 9.99992 7.33325 9.70144 7.33325 9.33325C7.33325 8.96506 7.03478 8.66659 6.66659 8.66659C6.2984 8.66659 5.99992 8.96506 5.99992 9.33325C5.99992 9.70144 6.2984 9.99992 6.66659 9.99992ZM8.99992 9.99992C9.36811 9.99992 9.66659 9.70144 9.66659 9.33325C9.66659 8.96506 9.36811 8.66659 8.99992 8.66659C8.63173 8.66659 8.33325 8.96506 8.33325 9.33325C8.33325 9.70144 8.63173 9.99992 8.99992 9.99992Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const Chat = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M13.0867 21.3877L13.7321 21.7697L13.0867 21.3877ZM13.6288 20.4718L12.9833 20.0898L13.6288 20.4718ZM10.3712 20.4718L9.72579 20.8539H9.72579L10.3712 20.4718ZM10.9133 21.3877L11.5587 21.0057L10.9133 21.3877ZM2.3806 15.9134L3.07351 15.6264V15.6264L2.3806 15.9134ZM7.78958 18.9915L7.77666 19.7413L7.78958 18.9915ZM5.08658 18.6194L4.79957 19.3123H4.79957L5.08658 18.6194ZM21.6194 15.9134L22.3123 16.2004V16.2004L21.6194 15.9134ZM16.2104 18.9915L16.1975 18.2416L16.2104 18.9915ZM18.9134 18.6194L19.2004 19.3123H19.2004L18.9134 18.6194ZM19.6125 2.7368L19.2206 3.37628L19.6125 2.7368ZM21.2632 4.38751L21.9027 3.99563V3.99563L21.2632 4.38751ZM4.38751 2.7368L3.99563 2.09732V2.09732L4.38751 2.7368ZM2.7368 4.38751L2.09732 3.99563H2.09732L2.7368 4.38751ZM9.40279 19.2098L9.77986 18.5615L9.77986 18.5615L9.40279 19.2098ZM13.0867 21.3877L13.7321 21.7697L14.2742 20.8539L13.6288 20.4718L12.9833 20.0898L12.4412 21.0057L13.0867 21.3877ZM10.3712 20.4718L9.72579 20.8539L10.2679 21.7697L10.9133 21.3877L11.5587 21.0057L11.0166 20.0898L10.3712 20.4718ZM13.0867 21.3877L12.4412 21.0057C12.2485 21.3313 11.7515 21.3313 11.5587 21.0057L10.9133 21.3877L10.2679 21.7697C11.0415 23.0767 12.9585 23.0767 13.7321 21.7697L13.0867 21.3877ZM10.5 2V2.75H13.5V2V1.25H10.5V2ZM22 10.5H21.25V11.5H22H22.75V10.5H22ZM2 11.5H2.75V10.5H2H1.25V11.5H2ZM2 11.5H1.25C1.25 12.6546 1.24959 13.5581 1.29931 14.2868C1.3495 15.0223 1.45323 15.6344 1.68769 16.2004L2.3806 15.9134L3.07351 15.6264C2.92737 15.2736 2.84081 14.8438 2.79584 14.1847C2.75041 13.5189 2.75 12.6751 2.75 11.5H2ZM7.78958 18.9915L7.8025 18.2416C6.54706 18.2199 5.88923 18.1401 5.37359 17.9265L5.08658 18.6194L4.79957 19.3123C5.60454 19.6457 6.52138 19.7197 7.77666 19.7413L7.78958 18.9915ZM2.3806 15.9134L1.68769 16.2004C2.27128 17.6093 3.39066 18.7287 4.79957 19.3123L5.08658 18.6194L5.3736 17.9265C4.33223 17.4951 3.50486 16.6678 3.07351 15.6264L2.3806 15.9134ZM22 11.5H21.25C21.25 12.6751 21.2496 13.5189 21.2042 14.1847C21.1592 14.8438 21.0726 15.2736 20.9265 15.6264L21.6194 15.9134L22.3123 16.2004C22.5468 15.6344 22.6505 15.0223 22.7007 14.2868C22.7504 13.5581 22.75 12.6546 22.75 11.5H22ZM16.2104 18.9915L16.2233 19.7413C17.4786 19.7197 18.3955 19.6457 19.2004 19.3123L18.9134 18.6194L18.6264 17.9265C18.1108 18.1401 17.4529 18.2199 16.1975 18.2416L16.2104 18.9915ZM21.6194 15.9134L20.9265 15.6264C20.4951 16.6678 19.6678 17.4951 18.6264 17.9265L18.9134 18.6194L19.2004 19.3123C20.6093 18.7287 21.7287 17.6093 22.3123 16.2004L21.6194 15.9134ZM13.5 2V2.75C15.1512 2.75 16.337 2.75079 17.2619 2.83873C18.1757 2.92561 18.7571 3.09223 19.2206 3.37628L19.6125 2.7368L20.0044 2.09732C19.2655 1.64457 18.4274 1.44279 17.4039 1.34547C16.3915 1.24921 15.1222 1.25 13.5 1.25V2ZM22 10.5H22.75C22.75 8.87781 22.7508 7.6085 22.6545 6.59611C22.5572 5.57256 22.3554 4.73445 21.9027 3.99563L21.2632 4.38751L20.6237 4.77938C20.9078 5.24291 21.0744 5.82434 21.1613 6.73809C21.2492 7.663 21.25 8.84876 21.25 10.5H22ZM19.6125 2.7368L19.2206 3.37628C19.7925 3.72672 20.2733 4.20752 20.6237 4.77938L21.2632 4.38751L21.9027 3.99563C21.4286 3.22194 20.7781 2.57144 20.0044 2.09732L19.6125 2.7368ZM10.5 2V1.25C8.87781 1.25 7.6085 1.24921 6.59611 1.34547C5.57256 1.44279 4.73445 1.64457 3.99563 2.09732L4.38751 2.7368L4.77938 3.37628C5.24291 3.09223 5.82434 2.92561 6.73809 2.83873C7.663 2.75079 8.84876 2.75 10.5 2.75V2ZM2 10.5H2.75C2.75 8.84876 2.75079 7.663 2.83873 6.73809C2.92561 5.82434 3.09223 5.24291 3.37628 4.77938L2.7368 4.38751L2.09732 3.99563C1.64457 4.73445 1.44279 5.57256 1.34547 6.59611C1.24921 7.6085 1.25 8.87781 1.25 10.5H2ZM4.38751 2.7368L3.99563 2.09732C3.22194 2.57144 2.57144 3.22194 2.09732 3.99563L2.7368 4.38751L3.37628 4.77938C3.72672 4.20752 4.20752 3.72672 4.77938 3.37628L4.38751 2.7368ZM10.3712 20.4718L11.0166 20.0898C10.8136 19.7468 10.6354 19.4441 10.4621 19.2063C10.2795 18.9559 10.0702 18.7304 9.77986 18.5615L9.40279 19.2098L9.02572 19.8582C9.07313 19.8857 9.13772 19.936 9.24985 20.0898C9.37122 20.2564 9.50835 20.4865 9.72579 20.8539L10.3712 20.4718ZM7.78958 18.9915L7.77666 19.7413C8.21575 19.7489 8.49387 19.7545 8.70588 19.7779C8.90399 19.7999 8.98078 19.832 9.02572 19.8582L9.40279 19.2098L9.77986 18.5615C9.4871 18.3912 9.18246 18.3215 8.87097 18.287C8.57339 18.2541 8.21375 18.2487 7.8025 18.2416L7.78958 18.9915ZM13.6288 20.4718L14.2742 20.8539C14.4916 20.4865 14.6287 20.2564 14.7501 20.0898C14.8622 19.936 14.9268 19.8857 14.9742 19.8582L14.5972 19.2098L14.2201 18.5615C13.9298 18.7304 13.7204 18.9559 13.5379 19.2063C13.3646 19.4441 13.1864 19.7468 12.9833 20.0898L13.6288 20.4718ZM16.2104 18.9915L16.1975 18.2416C15.7862 18.2487 15.4266 18.2541 15.129 18.287C14.8175 18.3215 14.5129 18.3912 14.2201 18.5615L14.5972 19.2098L14.9742 19.8582C15.0192 19.832 15.096 19.7999 15.2941 19.7779C15.5061 19.7545 15.7842 19.7489 16.2233 19.7413L16.2104 18.9915Z"
          fill="currentColor"
        />
        <path d="M12 15V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M8 13V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M16 13V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </g>
    </svg>
  );
};

export const CalenderICon = () => {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M9.6665 17.9999C9.6665 14.8572 9.6665 13.2859 10.6428 12.3096C11.6191 11.3333 13.1905 11.3333 16.3332 11.3333H19.6665C22.8092 11.3333 24.3805 11.3333 25.3569 12.3096C26.3332 13.2859 26.3332 14.8572 26.3332 17.9999V19.6666C26.3332 22.8093 26.3332 24.3806 25.3569 25.3569C24.3805 26.3333 22.8092 26.3333 19.6665 26.3333H16.3332C13.1905 26.3333 11.6191 26.3333 10.6428 25.3569C9.6665 24.3806 9.6665 22.8093 9.6665 19.6666V17.9999Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path
          d="M13.8335 11.3333V10.0833"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M22.1665 11.3333V10.0833"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M10.0835 15.5H25.9168" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M23.0002 22.1667C23.0002 22.6269 22.6271 23 22.1668 23C21.7066 23 21.3335 22.6269 21.3335 22.1667C21.3335 21.7064 21.7066 21.3333 22.1668 21.3333C22.6271 21.3333 23.0002 21.7064 23.0002 22.1667Z"
          fill="#1C274C"
        />
        <path
          d="M23.0002 18.8333C23.0002 19.2936 22.6271 19.6667 22.1668 19.6667C21.7066 19.6667 21.3335 19.2936 21.3335 18.8333C21.3335 18.3731 21.7066 18 22.1668 18C22.6271 18 23.0002 18.3731 23.0002 18.8333Z"
          fill="#1C274C"
        />
        <path
          d="M18.8332 22.1667C18.8332 22.6269 18.4601 23 17.9998 23C17.5396 23 17.1665 22.6269 17.1665 22.1667C17.1665 21.7064 17.5396 21.3333 17.9998 21.3333C18.4601 21.3333 18.8332 21.7064 18.8332 22.1667Z"
          fill="#1C274C"
        />
        <path
          d="M18.8332 18.8333C18.8332 19.2936 18.4601 19.6667 17.9998 19.6667C17.5396 19.6667 17.1665 19.2936 17.1665 18.8333C17.1665 18.3731 17.5396 18 17.9998 18C18.4601 18 18.8332 18.3731 18.8332 18.8333Z"
          fill="#1C274C"
        />
        <path
          d="M14.6667 22.1667C14.6667 22.6269 14.2936 23 13.8333 23C13.3731 23 13 22.6269 13 22.1667C13 21.7064 13.3731 21.3333 13.8333 21.3333C14.2936 21.3333 14.6667 21.7064 14.6667 22.1667Z"
          fill="#1C274C"
        />
        <path
          d="M14.6667 18.8333C14.6667 19.2936 14.2936 19.6667 13.8333 19.6667C13.3731 19.6667 13 19.2936 13 18.8333C13 18.3731 13.3731 18 13.8333 18C14.2936 18 14.6667 18.3731 14.6667 18.8333Z"
          fill="#1C274C"
        />
      </g>
    </svg>
  );
};

export const FileIcon = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="8.92 8.92 18.17 18.17">
      <g clipPath="url(#clip0_673_6073)">
        <path
          d="M20.8273 11.3781L20.3256 11.9356L20.8273 11.3781ZM24.1263 14.3472L23.6245 14.9047V14.9047L24.1263 14.3472ZM26.0448 16.4618L25.3597 16.767L25.3597 16.767L26.0448 16.4618ZM10.6428 25.3571L11.1731 24.8268L11.1731 24.8268L10.6428 25.3571ZM25.3569 25.3571L24.8265 24.8268L24.8265 24.8268L25.3569 25.3571ZM19.6665 25.5834H16.3332V27.0834H19.6665V25.5834ZM10.4165 19.6667V16.3334H8.9165V19.6667H10.4165ZM25.5832 19.3025V19.6667H27.0832V19.3025H25.5832ZM20.3256 11.9356L23.6245 14.9047L24.628 13.7897L21.329 10.8206L20.3256 11.9356ZM27.0832 19.3025C27.0832 17.9066 27.0983 16.9838 26.73 16.1567L25.3597 16.767C25.568 17.2347 25.5832 17.7741 25.5832 19.3025H27.0832ZM23.6245 14.9047C24.7606 15.9271 25.1514 16.2992 25.3597 16.767L26.73 16.1567C26.3616 15.3296 25.6656 14.7236 24.628 13.7897L23.6245 14.9047ZM16.358 10.4167C17.6856 10.4167 18.1555 10.4283 18.5722 10.5882L19.1096 9.1878C18.373 8.90517 17.572 8.91675 16.358 8.91675V10.4167ZM21.329 10.8206C20.431 10.0124 19.846 9.47039 19.1096 9.1878L18.5722 10.5882C18.989 10.7482 19.3438 11.052 20.3256 11.9356L21.329 10.8206ZM16.3332 25.5834C14.7406 25.5834 13.6217 25.5818 12.7755 25.4681C11.951 25.3572 11.4987 25.1524 11.1731 24.8268L10.1125 25.8874C10.7632 26.5382 11.5848 26.8215 12.5757 26.9547C13.545 27.085 14.783 27.0834 16.3332 27.0834V25.5834ZM8.9165 19.6667C8.9165 21.2169 8.91491 22.455 9.04523 23.4243C9.17845 24.4151 9.46175 25.2367 10.1125 25.8874L11.1731 24.8268C10.8476 24.5012 10.6427 24.0489 10.5319 23.2244C10.4181 22.3783 10.4165 21.2593 10.4165 19.6667H8.9165ZM19.6665 27.0834C21.2167 27.0834 22.4547 27.085 23.424 26.9547C24.4149 26.8215 25.2365 26.5382 25.8872 25.8874L24.8265 24.8268C24.501 25.1524 24.0487 25.3572 23.2241 25.4681C22.378 25.5818 21.2591 25.5834 19.6665 25.5834V27.0834ZM25.5832 19.6667C25.5832 21.2593 25.5816 22.3783 25.4678 23.2244C25.357 24.0489 25.1521 24.5012 24.8265 24.8268L25.8872 25.8874C26.5379 25.2367 26.8212 24.4151 26.9544 23.4243C27.0848 22.455 27.0832 21.2169 27.0832 19.6667H25.5832ZM10.4165 16.3334C10.4165 14.7409 10.4181 13.6219 10.5319 12.7758C10.6427 11.9512 10.8476 11.499 11.1731 11.1734L10.1125 10.1127C9.46175 10.7635 9.17845 11.585 9.04523 12.5759C8.91491 13.5452 8.9165 14.7833 8.9165 16.3334H10.4165ZM16.358 8.91675C14.7995 8.91675 13.5555 8.91517 12.5823 9.04542C11.5881 9.17847 10.7638 9.46141 10.1125 10.1127L11.1731 11.1734C11.4981 10.8484 11.9518 10.6432 12.7813 10.5322C13.6318 10.4183 14.7572 10.4167 16.358 10.4167V8.91675Z"
          fill="currentColor"
        ></path>
        <path
          d="M18.8335 10.0833V12.1666C18.8335 14.1308 18.8335 15.1129 19.4437 15.7231C20.0539 16.3333 21.036 16.3333 23.0002 16.3333H26.3335"
          stroke="currentColor"
          strokeWidth="1.5"
        ></path>
        <path
          d="M15.0833 23.4167L15.0833 19.25M15.0833 19.25L13.4167 20.8125M15.0833 19.25L16.75 20.8125"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
      </g>
      <defs>
        <clipPath id="clip0_673_6073">
          <rect width="20" height="20" fill="white" transform="translate(8 8)"></rect>
        </clipPath>
      </defs>
    </svg>
  );
};

export const ListIcon = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="9.17 10 17.67 16">
      <g>
        <path
          d="M9.6665 12.5833L10.6784 13.8333L14.2498 10.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M9.6665 18.4166L10.6784 19.6666L14.2498 16.3333"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M9.6665 24.2501L10.6784 25.5001L14.2498 22.1667"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        ></path>
        <path
          d="M26.3333 23.8333L18 23.8333"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
        <path
          d="M26.3333 18L18 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
        <path
          d="M26.3333 12.1667L18 12.1667"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        ></path>
      </g>
    </svg>
  );
};

export const HomeIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className={className}>
      <path
        d="M1.21429 15.895H5.69743V10.2851C5.69743 10.0324 5.79174 9.82063 5.98036 9.64972C6.16817 9.47808 6.4009 9.39227 6.67857 9.39227H10.3214C10.5991 9.39227 10.8322 9.47808 11.0209 9.64972C11.2087 9.82063 11.3026 10.0324 11.3026 10.2851V15.895H15.7857V6.29061C15.7857 6.17716 15.7586 6.07403 15.7044 5.98122C15.6501 5.8884 15.576 5.80737 15.4821 5.73812L8.94443 1.25414C8.81976 1.15543 8.67162 1.10608 8.5 1.10608C8.32838 1.10608 8.18064 1.15543 8.05679 1.25414L1.51786 5.73812C1.42476 5.80884 1.35069 5.88987 1.29564 5.98122C1.2406 6.07256 1.21348 6.17569 1.21429 6.29061V15.895ZM0 15.895V6.29061C0 6.00773 0.069619 5.73996 0.208857 5.48729C0.348095 5.23462 0.539952 5.02652 0.784428 4.86298L7.32336 0.356907C7.66579 0.118969 8.05679 0 8.49636 0C8.93593 0 9.32936 0.118969 9.67664 0.356907L16.2156 4.86188C16.4609 5.02541 16.6527 5.23389 16.7911 5.48729C16.9304 5.73996 17 6.00773 17 6.29061V15.895C17 16.1912 16.879 16.4494 16.6369 16.6696C16.3949 16.8899 16.1111 17 15.7857 17H11.0694C10.791 17 10.5578 16.9145 10.37 16.7436C10.1822 16.572 10.0883 16.3599 10.0883 16.1072V10.4983H6.91172V16.1072C6.91172 16.3606 6.81781 16.5727 6.63 16.7436C6.44219 16.9145 6.20945 17 5.93179 17H1.21429C0.888857 17 0.605119 16.8899 0.363071 16.6696C0.121024 16.4494 0 16.1912 0 15.895Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const EmojiICon = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" className={className} fill="currentColor" viewBox="2 2 20 20">
      <path d="M8.5 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3M15.5 9c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5S16.33 9 15.5 9"></path>
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8"></path>
      <path d="M14.83 14.83a3.94 3.94 0 0 1-2.02 1.09 4.053 4.053 0 0 1-2.37-.23 3.935 3.935 0 0 1-1.27-.86c-.18-.18-.34-.38-.49-.59l-1.66 1.12c.22.32.46.62.73.88.27.27.57.52.89.73s.66.4 1.02.55.74.27 1.13.35a6.1 6.1 0 0 0 2.42 0c.38-.08.76-.2 1.13-.35.36-.15.7-.34 1.02-.55s.62-.46.89-.73.52-.57.73-.89l-1.66-1.12c-.14.21-.31.41-.49.59Z"></path>
    </svg>
  );
};

export const NoteDownIcon = () => {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M11.3335 26.3333H24.6668"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M19.5735 11.0525L20.1915 10.4346C21.2153 9.4108 22.8752 9.4108 23.899 10.4346C24.9228 11.4584 24.9228 13.1183 23.899 14.1421L23.2811 14.76M19.5735 11.0525C19.5735 11.0525 19.6508 12.3656 20.8094 13.5242C21.968 14.6828 23.2811 14.76 23.2811 14.76M19.5735 11.0525L13.8927 16.7333C13.5079 17.1181 13.3155 17.3105 13.1501 17.5226C12.9549 17.7729 12.7876 18.0436 12.6511 18.3301C12.5353 18.573 12.4493 18.8311 12.2772 19.3473L11.548 21.5348M23.2811 14.76L17.6002 20.4409C17.2155 20.8256 17.0231 21.018 16.8109 21.1835C16.5607 21.3787 16.29 21.546 16.0035 21.6825C15.7606 21.7983 15.5025 21.8843 14.9863 22.0564L12.7988 22.7855M12.7988 22.7855L12.2641 22.9638C12.01 23.0485 11.7299 22.9823 11.5406 22.793C11.3512 22.6036 11.2851 22.3236 11.3698 22.0695L11.548 21.5348M12.7988 22.7855L11.548 21.5348"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};

export const NoteDownMessageIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0 8C0 3.58172 3.58172 0 8 0H28C32.4183 0 36 3.58172 36 8V28C36 32.4183 32.4183 36 28 36H8C3.58172 36 0 32.4183 0 28V8Z"
        fill='var(--color-ucass-active)'
      />
      <g clipPath="url(#clip0_673_5986)">
        <path
          d="M19.9666 11.399L20.739 10.6266C22.0187 9.34681 24.0936 9.34681 25.3734 10.6266C26.6531 11.9063 26.6531 13.9812 25.3734 15.261L24.601 16.0334M19.9666 11.399C19.9666 11.399 20.0631 13.0403 21.5114 14.4886C22.9596 15.9368 24.601 16.0334 24.601 16.0334M19.9666 11.399L12.8655 18.5C12.3846 18.981 12.1441 19.2215 11.9373 19.4866C11.6933 19.7994 11.4841 20.1378 11.3135 20.4959C11.1688 20.7995 11.0612 21.1221 10.8461 21.7674L9.93468 24.5018M24.601 16.0334L17.4999 23.1344C17.019 23.6154 16.7785 23.8558 16.5133 24.0627C16.2005 24.3066 15.8621 24.5158 15.504 24.6865C15.2004 24.8311 14.8778 24.9387 14.2325 25.1538L11.4981 26.0652M11.4981 26.0652L10.8297 26.288C10.5122 26.3939 10.1621 26.3112 9.92536 26.0746C9.68867 25.8379 9.60603 25.4878 9.71188 25.1702L9.93468 24.5018M11.4981 26.0652L9.93468 24.5018"
          stroke="white"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_673_5986">
          <rect width="20" height="20" fill="white" transform="translate(8 8)" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const PhoneIcon1 = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M16.5562 12.9062L16.1007 13.359C16.1007 13.359 15.0181 14.4355 12.0631 11.4972C9.10812 8.55901 10.1907 7.48257 10.1907 7.48257L10.4775 7.19738C11.1841 6.49484 11.2507 5.36691 10.6342 4.54348L9.37326 2.85908C8.61028 1.83992 7.13596 1.70529 6.26145 2.57483L4.69185 4.13552C4.25823 4.56668 3.96765 5.12559 4.00289 5.74561C4.09304 7.33182 4.81071 10.7447 8.81536 14.7266C13.0621 18.9492 17.0468 19.117 18.6763 18.9651C19.1917 18.9171 19.6399 18.6546 20.0011 18.2954L21.4217 16.883C22.3806 15.9295 22.1102 14.2949 20.8833 13.628L18.9728 12.5894C18.1672 12.1515 17.1858 12.2801 16.5562 12.9062Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const LinkIcon = ({ className }: IconProps) => {
  return (
    <svg width={'12'} height={'12'} viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1037_14908)">
        <path
          d="M10.4856 2.58939C11.4418 1.62946 12.8405 1.6093 13.6148 2.38662C14.3906 3.1654 14.3697 4.57289 13.4128 5.53348L11.7969 7.15564C11.602 7.35128 11.6027 7.66786 11.7983 7.86274C11.9939 8.05763 12.3105 8.05701 12.5054 7.86137L14.1213 6.23921C15.3955 4.96007 15.5555 2.91785 14.3233 1.68088C13.0896 0.442449 11.0519 0.603857 9.7771 1.88366L6.54533 5.12796C5.27113 6.4071 5.11116 8.44934 6.34334 9.68631C6.53822 9.88195 6.8548 9.88256 7.05044 9.68768C7.24608 9.4928 7.2467 9.17621 7.05181 8.98057C6.27604 8.20179 6.29694 6.79428 7.2538 5.8337L10.4856 2.58939Z"
          fill="currentColor"
        />
        <path
          d="M9.65661 6.31391C9.46172 6.11827 9.14514 6.11765 8.9495 6.31254C8.75386 6.50742 8.75325 6.824 8.94813 7.01964C9.72391 7.79843 9.70302 9.20591 8.74615 10.1665L5.5144 13.4108C4.55818 14.3708 3.15946 14.3909 2.38515 13.6136C1.60937 12.8348 1.63027 11.4273 2.58714 10.4667L4.20303 8.84454C4.39792 8.6489 4.3973 8.33232 4.20166 8.13743C4.00602 7.94255 3.68944 7.94316 3.49456 8.1388L1.87866 9.76097C0.604462 11.0401 0.444489 13.0824 1.67667 14.3193C2.91032 15.5578 4.94802 15.3964 6.22287 14.1166L9.45462 10.8722C10.7288 9.59308 10.8888 7.55088 9.65661 6.31391Z"
          fill="currentColor"
        />
        <path
          d="M10.4856 2.58939C11.4418 1.62946 12.8405 1.6093 13.6148 2.38662C14.3906 3.1654 14.3697 4.57289 13.4128 5.53348L11.7969 7.15564C11.602 7.35128 11.6027 7.66786 11.7983 7.86274C11.9939 8.05763 12.3105 8.05701 12.5054 7.86137L14.1213 6.23921C15.3955 4.96007 15.5555 2.91785 14.3233 1.68088C13.0896 0.442449 11.0519 0.603857 9.7771 1.88366L6.54533 5.12796C5.27113 6.4071 5.11116 8.44934 6.34334 9.68631C6.53822 9.88195 6.8548 9.88256 7.05044 9.68768C7.24608 9.4928 7.2467 9.17621 7.05181 8.98057C6.27604 8.20179 6.29694 6.79428 7.2538 5.8337L10.4856 2.58939ZM10.4856 2.58939L10.1313 2.23652M8.74615 10.1665C9.70302 9.20591 9.72391 7.79843 8.94813 7.01964C8.75325 6.824 8.75386 6.50742 8.9495 6.31254C9.14514 6.11765 9.46172 6.11827 9.65661 6.31391C10.8888 7.55088 10.7288 9.59308 9.45462 10.8722L6.22287 14.1166M8.74615 10.1665L9.10038 10.5194M8.74615 10.1665L5.5144 13.4108C4.55818 14.3708 3.15946 14.3909 2.38515 13.6136C1.60937 12.8348 1.63027 11.4273 2.58714 10.4667L4.20303 8.84454C4.39792 8.6489 4.3973 8.33232 4.20166 8.13743C4.00602 7.94255 3.68944 7.94316 3.49456 8.1388L1.87866 9.76097C0.604462 11.0401 0.444489 13.0824 1.67667 14.3193C2.91032 15.5578 4.94802 15.3964 6.22287 14.1166M6.22287 14.1166L5.89399 13.7889"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1037_14908">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const PDFIcon = ({ className }: IconProps) => {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={className}>
      <path
        d="M7.75 4C7.75 2.20508 9.20508 0.75 11 0.75H27C27.1212 0.75 27.2375 0.798159 27.3232 0.883885L38.1161 11.6768C38.2018 11.7625 38.25 11.8788 38.25 12V36C38.25 37.7949 36.7949 39.25 35 39.25H11C9.20507 39.25 7.75 37.7949 7.75 36V4Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M27 0.5V8C27 10.2091 28.7909 12 31 12H38.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1 20C1 18.8954 1.89543 18 3 18H25C26.1046 18 27 18.8954 27 20V32C27 33.1046 26.1046 34 25 34H3C1.89543 34 1 33.1046 1 32V20Z"
        fill="#D92D20"
      />
      <path
        d="M4.8323 30V22.7273H7.70162C8.25323 22.7273 8.72316 22.8326 9.11142 23.0433C9.49967 23.2517 9.7956 23.5417 9.9992 23.9134C10.2052 24.2827 10.3082 24.7088 10.3082 25.1918C10.3082 25.6747 10.204 26.1009 9.99565 26.4702C9.78732 26.8395 9.48547 27.1271 9.09011 27.3331C8.69712 27.5391 8.22127 27.642 7.66255 27.642H5.83372V26.4098H7.41397C7.7099 26.4098 7.95375 26.3589 8.14551 26.2571C8.33964 26.1529 8.48405 26.0097 8.57875 25.8274C8.67581 25.6428 8.72434 25.4309 8.72434 25.1918C8.72434 24.9503 8.67581 24.7396 8.57875 24.5597C8.48405 24.3774 8.33964 24.2365 8.14551 24.1371C7.95138 24.0353 7.70517 23.9844 7.40687 23.9844H6.36994V30H4.8323ZM13.885 30H11.3069V22.7273H13.9063C14.6379 22.7273 15.2676 22.8729 15.7955 23.1641C16.3235 23.4529 16.7295 23.8684 17.0136 24.4105C17.3 24.9527 17.4433 25.6013 17.4433 26.3565C17.4433 27.1141 17.3 27.7652 17.0136 28.3097C16.7295 28.8542 16.3211 29.272 15.7884 29.5632C15.2581 29.8544 14.6237 30 13.885 30ZM12.8445 28.6825H13.8211C14.2757 28.6825 14.658 28.602 14.9681 28.4411C15.2806 28.2777 15.515 28.0256 15.6713 27.6847C15.8299 27.3414 15.9092 26.8987 15.9092 26.3565C15.9092 25.8191 15.8299 25.38 15.6713 25.0391C15.515 24.6982 15.2818 24.4472 14.9717 24.2862C14.6615 24.1252 14.2792 24.0447 13.8247 24.0447H12.8445V28.6825ZM18.5823 30V22.7273H23.3976V23.995H20.1199V25.728H23.078V26.9957H20.1199V30H18.5823Z"
        fill="white"
      />
    </svg>
  );
};

export const TaskIcon = () => {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path d="M10 3L1.5 3" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 5.5L1.5 5.5" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 8H1.5" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M7 6.75L8.05 8L10 5.5"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

export const AddAppIcon = () => {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_965_2080)">
        <path
          d="M7.25 3.25H8.75M8.75 3.25H10.25M8.75 3.25V4.75M8.75 3.25V1.75"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.25 3.25C1.25 2.30719 1.25 1.83579 1.54289 1.54289C1.83579 1.25 2.30719 1.25 3.25 1.25C4.19281 1.25 4.66421 1.25 4.95711 1.54289C5.25 1.83579 5.25 2.30719 5.25 3.25C5.25 4.19281 5.25 4.66421 4.95711 4.95711C4.66421 5.25 4.19281 5.25 3.25 5.25C2.30719 5.25 1.83579 5.25 1.54289 4.95711C1.25 4.66421 1.25 4.19281 1.25 3.25Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path
          d="M6.75 8.75C6.75 7.80719 6.75 7.33579 7.04289 7.04289C7.33579 6.75 7.80719 6.75 8.75 6.75C9.69281 6.75 10.1642 6.75 10.4571 7.04289C10.75 7.33579 10.75 7.80719 10.75 8.75C10.75 9.69281 10.75 10.1642 10.4571 10.4571C10.1642 10.75 9.69281 10.75 8.75 10.75C7.80719 10.75 7.33579 10.75 7.04289 10.4571C6.75 10.1642 6.75 9.69281 6.75 8.75Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path
          d="M1.25 8.75C1.25 7.80719 1.25 7.33579 1.54289 7.04289C1.83579 6.75 2.30719 6.75 3.25 6.75C4.19281 6.75 4.66421 6.75 4.95711 7.04289C5.25 7.33579 5.25 7.80719 5.25 8.75C5.25 9.69281 5.25 10.1642 4.95711 10.4571C4.66421 10.75 4.19281 10.75 3.25 10.75C2.30719 10.75 1.83579 10.75 1.54289 10.4571C1.25 10.1642 1.25 9.69281 1.25 8.75Z"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_965_2080">
          <rect width="12" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const Download = ({ className = '' }: IconProps) => {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" className={className}>
      <g>
        <path
          d="M12.5535 17.0881C12.4114 17.2435 12.2106 17.332 12 17.332C11.7894 17.332 11.5886 17.2435 11.4465 17.0881L7.44648 12.7131C7.16698 12.4074 7.18822 11.933 7.49392 11.6535C7.79963 11.374 8.27402 11.3953 8.55352 11.701L11.25 14.6502V3.58203C11.25 3.16782 11.5858 2.83203 12 2.83203C12.4142 2.83203 12.75 3.16782 12.75 3.58203V14.6502L15.4465 11.701C15.726 11.3953 16.2004 11.374 16.5061 11.6535C16.8118 11.933 16.833 12.4074 16.5535 12.7131L12.5535 17.0881Z"
          fill="currentColor"
        />
        <path
          d="M3.75 15.582C3.75 15.1678 3.41422 14.832 3 14.832C2.58579 14.832 2.25 15.1678 2.25 15.582V15.6369C2.24998 17.0045 2.24996 18.1068 2.36652 18.9738C2.48754 19.8739 2.74643 20.6318 3.34835 21.2337C3.95027 21.8356 4.70814 22.0945 5.60825 22.2155C6.47522 22.3321 7.57754 22.3321 8.94513 22.332H15.0549C16.4225 22.3321 17.5248 22.3321 18.3918 22.2155C19.2919 22.0945 20.0497 21.8356 20.6517 21.2337C21.2536 20.6318 21.5125 19.8739 21.6335 18.9738C21.75 18.1068 21.75 17.0045 21.75 15.6369V15.582C21.75 15.1678 21.4142 14.832 21 14.832C20.5858 14.832 20.25 15.1678 20.25 15.582C20.25 17.0174 20.2484 18.0186 20.1469 18.7739C20.0482 19.5077 19.8678 19.8963 19.591 20.173C19.3142 20.4498 18.9257 20.6302 18.1919 20.7289C17.4365 20.8304 16.4354 20.832 15 20.832H9C7.56459 20.832 6.56347 20.8304 5.80812 20.7289C5.07435 20.6302 4.68577 20.4498 4.40901 20.173C4.13225 19.8963 3.9518 19.5077 3.85315 18.7739C3.75159 18.0186 3.75 17.0174 3.75 15.582Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const Dialog = ({ className = '' }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M22 8.5C22 4.91015 19.0899 2 15.5 2C13.4171 2 11.5631 2.9823 10.3735 4.50721C15.4471 4.70336 19.5 8.87838 19.5 14C19.5 14.1103 19.4981 14.2202 19.4944 14.3296L19.8267 14.4185C20.793 14.677 21.677 13.793 21.4185 12.8267L21.2911 12.3506C21.1882 11.9661 21.2501 11.5598 21.4155 11.1977C21.7908 10.376 22 9.46242 22 8.5Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 14C18 18.4183 14.4183 22 10 22C8.76449 22 7.5944 21.7199 6.54976 21.2198C6.19071 21.0479 5.78393 20.9876 5.39939 21.0904L4.17335 21.4185C3.20701 21.677 2.32295 20.793 2.58151 19.8267L2.90955 18.6006C3.01245 18.2161 2.95209 17.8093 2.7802 17.4502C2.28008 16.4056 2 15.2355 2 14C2 9.58172 5.58172 6 10 6C14.4183 6 18 9.58172 18 14ZM6.5 15C7.05228 15 7.5 14.5523 7.5 14C7.5 13.4477 7.05228 13 6.5 13C5.94772 13 5.5 13.4477 5.5 14C5.5 14.5523 5.94772 15 6.5 15ZM10 15C10.5523 15 11 14.5523 11 14C11 13.4477 10.5523 13 10 13C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15ZM13.5 15C14.0523 15 14.5 14.5523 14.5 14C14.5 13.4477 14.0523 13 13.5 13C12.9477 13 12.5 13.4477 12.5 14C12.5 14.5523 12.9477 15 13.5 15Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const VideoCamera = ({ className = '' }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2 11.5V12.5C2 15.7875 2 17.4312 2.90796 18.5376C3.07418 18.7401 3.25989 18.9258 3.46243 19.092C4.56878 20 6.21252 20 9.5 20C12.7875 20 14.4312 20 15.5376 19.092C15.7401 18.9258 15.9258 18.7401 16.092 18.5376C16.7936 17.6827 16.9531 16.507 16.9893 14.5L17.6584 14.8292C19.6042 15.8021 20.5772 16.2886 21.2886 15.8489C22 15.4093 22 14.3215 22 12.1459V11.8541C22 9.67853 22 8.59075 21.2886 8.15107C20.5772 7.7114 19.6042 8.19788 17.6584 9.17082L16.9893 9.50002C16.9531 7.49303 16.7936 6.3173 16.092 5.46243C15.9258 5.25989 15.7401 5.07418 15.5376 4.90796C14.4312 4 12.7875 4 9.5 4C6.21252 4 4.56878 4 3.46243 4.90796C3.25989 5.07418 3.07418 5.25989 2.90796 5.46243C2 6.56878 2 8.21252 2 11.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Letter = ({ className = '' }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2 7L10.1649 12.7154C10.8261 13.1783 11.1567 13.4097 11.5163 13.4993C11.8339 13.5785 12.1661 13.5785 12.4837 13.4993C12.8433 13.4097 13.1739 13.1783 13.8351 12.7154L22 7M6.8 20H17.2C18.8802 20 19.7202 20 20.362 19.673C20.9265 19.3854 21.3854 18.9265 21.673 18.362C22 17.7202 22 16.8802 22 15.2V8.8C22 7.11984 22 6.27976 21.673 5.63803C21.3854 5.07354 20.9265 4.6146 20.362 4.32698C19.7202 4 18.8802 4 17.2 4H6.8C5.11984 4 4.27976 4 3.63803 4.32698C3.07354 4.6146 2.6146 5.07354 2.32698 5.63803C2 6.27976 2 7.11984 2 8.8V15.2C2 16.8802 2 17.7202 2.32698 18.362C2.6146 18.9265 3.07354 19.3854 3.63803 19.673C4.27976 20 5.11984 20 6.8 20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const PrinterMinimalistic = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M17.1213 21.1213C18 20.2426 18 18.8284 18 16L18 12.6595C16.5233 12.1579 14.5419 11.7498 12 11.7498C9.45812 11.7498 7.47667 12.1579 6 12.6595V16C6 18.8284 6 20.2426 6.87868 21.1213C7.75736 22 9.17157 22 12 22C14.8284 22 16.2426 22 17.1213 21.1213Z"
        fill="currentColor"
      />
      <path
        d="M16 6H8C5.17157 6 3.75736 6 2.87868 6.87868C2 7.75736 2 9.17157 2 12C2 14.8284 2 16.2426 2.87868 17.1213C3.37105 17.6137 4.03157 17.8302 5.01484 17.9253C4.99996 17.3662 4.99998 16.7481 5 16.0706L5 13.0424C4.93434 13.0706 4.87007 13.0988 4.8072 13.1271C4.42933 13.2967 3.98546 13.1279 3.8158 12.7501C3.64614 12.3722 3.81493 11.9283 4.1928 11.7587C5.91455 10.9856 8.4805 10.2498 12 10.2498C15.5195 10.2498 18.0854 10.9856 19.8072 11.7587C20.1851 11.9283 20.3539 12.3722 20.1842 12.7501C20.0145 13.1279 19.5707 13.2967 19.1928 13.1271C19.1299 13.0988 19.0657 13.0706 19 13.0424L19 16.0706C19 16.748 19 17.3662 18.9852 17.9253C19.9684 17.8302 20.629 17.6137 21.1213 17.1213C22 16.2426 22 14.8284 22 12C22 9.17157 22 7.75736 21.1213 6.87868C20.2426 6 18.8284 6 16 6Z"
        fill="currentColor"
      />
      <path
        d="M17.1209 2.87868C16.2422 2 14.828 2 11.9995 2C9.17112 2 7.75691 2 6.87823 2.87868C6.38586 3.37105 6.16939 4.03157 6.07422 5.01484C6.63346 4.99996 7.25161 4.99998 7.92921 5H16.0704C16.7478 4.99998 17.3658 4.99996 17.9249 5.01483C17.8297 4.03156 17.6132 3.37105 17.1209 2.87868Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UserCircle = ({ className = '' }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="2 2 20 20">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM15 9C15 10.6569 13.6569 12 12 12C10.3431 12 9 10.6569 9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9ZM12 20.5C13.784 20.5 15.4397 19.9504 16.8069 19.0112C17.4108 18.5964 17.6688 17.8062 17.3178 17.1632C16.59 15.8303 15.0902 15 11.9999 15C8.90969 15 7.40997 15.8302 6.68214 17.1632C6.33105 17.8062 6.5891 18.5963 7.19296 19.0111C8.56018 19.9503 10.2159 20.5 12 20.5Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const UsersGroup = ({ className = '' }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15.5 7.5C15.5 9.433 13.933 11 12 11C10.067 11 8.5 9.433 8.5 7.5C8.5 5.567 10.067 4 12 4C13.933 4 15.5 5.567 15.5 7.5Z"
        fill="currentColor"
      />
      <path
        d="M18 16.5C18 18.433 15.3137 20 12 20C8.68629 20 6 18.433 6 16.5C6 14.567 8.68629 13 12 13C15.3137 13 18 14.567 18 16.5Z"
        fill="currentColor"
      />
      <path
        d="M7.12205 5C7.29951 5 7.47276 5.01741 7.64005 5.05056C7.23249 5.77446 7 6.61008 7 7.5C7 8.36825 7.22131 9.18482 7.61059 9.89636C7.45245 9.92583 7.28912 9.94126 7.12205 9.94126C5.70763 9.94126 4.56102 8.83512 4.56102 7.47063C4.56102 6.10614 5.70763 5 7.12205 5Z"
        fill="currentColor"
      />
      <path
        d="M5.44734 18.986C4.87942 18.3071 4.5 17.474 4.5 16.5C4.5 15.5558 4.85657 14.744 5.39578 14.0767C3.4911 14.2245 2 15.2662 2 16.5294C2 17.8044 3.5173 18.8538 5.44734 18.986Z"
        fill="currentColor"
      />
      <path
        d="M16.9999 7.5C16.9999 8.36825 16.7786 9.18482 16.3893 9.89636C16.5475 9.92583 16.7108 9.94126 16.8779 9.94126C18.2923 9.94126 19.4389 8.83512 19.4389 7.47063C19.4389 6.10614 18.2923 5 16.8779 5C16.7004 5 16.5272 5.01741 16.3599 5.05056C16.7674 5.77446 16.9999 6.61008 16.9999 7.5Z"
        fill="currentColor"
      />
      <path
        d="M18.5526 18.986C20.4826 18.8538 21.9999 17.8044 21.9999 16.5294C21.9999 15.2662 20.5088 14.2245 18.6041 14.0767C19.1433 14.744 19.4999 15.5558 19.4999 16.5C19.4999 17.474 19.1205 18.3071 18.5526 18.986Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ViewProfileIcon = () => {
  return (
    <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="#1C274C" strokeWidth="1.5">
        <circle cx="8" cy="4" r="2.7" />
        <path d="M13 12c0 1 0 3-5 3s-5-2-5-3c0-2 2-3 5-3s5 1 5 3Z" />
      </g>
    </svg>
  );
};
export const WidgetAdd = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.5 2.75C17.9142 2.75 18.25 3.08579 18.25 3.5V5.75H20.5C20.9142 5.75 21.25 6.08579 21.25 6.5C21.25 6.91421 20.9142 7.25 20.5 7.25H18.25V9.5C18.25 9.91421 17.9142 10.25 17.5 10.25C17.0858 10.25 16.75 9.91421 16.75 9.5V7.25H14.5C14.0858 7.25 13.75 6.91421 13.75 6.5C13.75 6.08579 14.0858 5.75 14.5 5.75H16.75V3.5C16.75 3.08579 17.0858 2.75 17.5 2.75Z"
        fill="currentColor"
      />
      <path
        d="M2 6.5C2 4.37868 2 3.31802 2.65901 2.65901C3.31802 2 4.37868 2 6.5 2C8.62132 2 9.68198 2 10.341 2.65901C11 3.31802 11 4.37868 11 6.5C11 8.62132 11 9.68198 10.341 10.341C9.68198 11 8.62132 11 6.5 11C4.37868 11 3.31802 11 2.65901 10.341C2 9.68198 2 8.62132 2 6.5Z"
        fill="currentColor"
      />
      <path
        d="M13 17.5C13 15.3787 13 14.318 13.659 13.659C14.318 13 15.3787 13 17.5 13C19.6213 13 20.682 13 21.341 13.659C22 14.318 22 15.3787 22 17.5C22 19.6213 22 20.682 21.341 21.341C20.682 22 19.6213 22 17.5 22C15.3787 22 14.318 22 13.659 21.341C13 20.682 13 19.6213 13 17.5Z"
        fill="currentColor"
      />
      <path
        d="M2 17.5C2 15.3787 2 14.318 2.65901 13.659C3.31802 13 4.37868 13 6.5 13C8.62132 13 9.68198 13 10.341 13.659C11 14.318 11 15.3787 11 17.5C11 19.6213 11 20.682 10.341 21.341C9.68198 22 8.62132 22 6.5 22C4.37868 22 3.31802 22 2.65901 21.341C2 20.682 2 19.6213 2 17.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MusicNote = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10.0909 11.9629L19.3636 8.63087V14.1707C18.8126 13.8538 18.1574 13.67 17.4545 13.67C15.4964 13.67 13.9091 15.096 13.9091 16.855C13.9091 18.614 15.4964 20.04 17.4545 20.04C19.4126 20.04 21 18.614 21 16.855C21 16.855 21 16.8551 21 16.855L21 7.49236C21 6.37238 21 5.4331 20.9123 4.68472C20.8999 4.57895 20.8852 4.4738 20.869 4.37569C20.7845 3.86441 20.6352 3.38745 20.347 2.98917C20.2028 2.79002 20.024 2.61055 19.8012 2.45628C19.7594 2.42736 19.716 2.39932 19.6711 2.3722L19.6621 2.36679C18.8906 1.90553 18.0233 1.93852 17.1298 2.14305C16.2657 2.34086 15.1944 2.74368 13.8808 3.23763L11.5963 4.09656C10.9806 4.32806 10.4589 4.52419 10.0494 4.72734C9.61376 4.94348 9.23849 5.1984 8.95707 5.57828C8.67564 5.95817 8.55876 6.36756 8.50501 6.81203C8.4545 7.22978 8.45452 7.7378 8.45455 8.33743V16.1307C7.90347 15.8138 7.24835 15.63 6.54545 15.63C4.58735 15.63 3 17.056 3 18.815C3 20.574 4.58735 22 6.54545 22C8.50355 22 10.0909 20.574 10.0909 18.815C10.0909 18.815 10.0909 18.8151 10.0909 18.815L10.0909 11.9629Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Routing = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M16.5 4.25C18.8472 4.25 20.75 6.15279 20.75 8.5C20.75 10.8472 18.8472 12.75 16.5 12.75H7.5C5.98122 12.75 4.75 13.9812 4.75 15.5C4.75 17.0188 5.98122 18.25 7.5 18.25H18.1893L17.4697 17.5303C17.1768 17.2374 17.1768 16.7626 17.4697 16.4697C17.7626 16.1768 18.2374 16.1768 18.5303 16.4697L20.5303 18.4697C20.8232 18.7626 20.8232 19.2374 20.5303 19.5303L18.5303 21.5303C18.2374 21.8232 17.7626 21.8232 17.4697 21.5303C17.1768 21.2374 17.1768 20.7626 17.4697 20.4697L18.1893 19.75H7.5C5.15279 19.75 3.25 17.8472 3.25 15.5C3.25 13.1528 5.15279 11.25 7.5 11.25H16.5C18.0188 11.25 19.25 10.0188 19.25 8.5C19.25 6.98122 18.0188 5.75 16.5 5.75H7.85462C7.55793 6.48296 6.83934 7 6 7C4.89543 7 4 6.10457 4 5C4 3.89543 4.89543 3 6 3C6.83934 3 7.55793 3.51704 7.85462 4.25H16.5Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const VideoIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="13" viewBox="0 0 17 13" fill="none" className={className}>
      <path
        d="M1.7 13C1.2325 13 0.832433 12.841 0.4998 12.5231C0.167167 12.2051 0.000566667 11.8224 0 11.375V1.625C0 1.17812 0.1666 0.795708 0.4998 0.47775C0.833 0.159792 1.23307 0.000541667 1.7 0H11.9C12.3675 0 12.7678 0.15925 13.1011 0.47775C13.4343 0.79625 13.6006 1.17867 13.6 1.625V5.28125L17 2.03125V10.9687L13.6 7.71875V11.375C13.6 11.8219 13.4337 12.2046 13.1011 12.5231C12.7684 12.8416 12.3681 13.0005 11.9 13H1.7ZM1.7 11.375H11.9V1.625H1.7V11.375Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const DotsDropDown = ({ className }: IconProps) => {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_d_673_6030)">
        <path
          d="M2 9C2 4.58172 5.58172 1 10 1H30C34.4183 1 38 4.58172 38 9V29C38 33.4183 34.4183 37 30 37H10C5.58172 37 2 33.4183 2 29V9Z"
          fill="white"
        />
        <path
          d="M2.5 9C2.5 4.85786 5.85786 1.5 10 1.5H30C34.1421 1.5 37.5 4.85786 37.5 9V29C37.5 33.1421 34.1421 36.5 30 36.5H10C5.85786 36.5 2.5 33.1421 2.5 29V9Z"
          stroke="#D0D5DD"
        />
        <g>
          <path
            d="M15.8333 18.9999C15.8333 19.9204 15.0871 20.6666 14.1667 20.6666C13.2462 20.6666 12.5 19.9204 12.5 18.9999C12.5 18.0794 13.2462 17.3333 14.1667 17.3333C15.0871 17.3333 15.8333 18.0794 15.8333 18.9999Z"
            fill="#1C274C"
          />
          <path
            d="M21.6667 18.9999C21.6667 19.9204 20.9205 20.6666 20 20.6666C19.0795 20.6666 18.3333 19.9204 18.3333 18.9999C18.3333 18.0794 19.0795 17.3333 20 17.3333C20.9205 17.3333 21.6667 18.0794 21.6667 18.9999Z"
            fill="#1C274C"
          />
          <path
            d="M27.5 18.9999C27.5 19.9204 26.7538 20.6666 25.8333 20.6666C24.9129 20.6666 24.1667 19.9204 24.1667 18.9999C24.1667 18.0794 24.9129 17.3333 25.8333 17.3333C26.7538 17.3333 27.5 18.0794 27.5 18.9999Z"
            fill="#1C274C"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_d_673_6030"
          x="0"
          y="0"
          width="40"
          height="40"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.0627451 0 0 0 0 0.0941176 0 0 0 0 0.156863 0 0 0 0.05 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_673_6030" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_673_6030"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const DotsDropInvertIcon = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M9.99984 5.83333C9.07936 5.83333 8.33317 5.08714 8.33317 4.16667C8.33317 3.24619 9.07936 2.5 9.99984 2.5C10.9203 2.5 11.6665 3.24619 11.6665 4.16667C11.6665 5.08714 10.9203 5.83333 9.99984 5.83333Z"
          fill="#242424"
        />
        <path
          d="M9.99984 11.6667C9.07936 11.6667 8.33317 10.9205 8.33317 10C8.33317 9.07952 9.07936 8.33333 9.99984 8.33333C10.9203 8.33333 11.6665 9.07952 11.6665 10C11.6665 10.9205 10.9203 11.6667 9.99984 11.6667Z"
          fill="#242424"
        />
        <path
          d="M9.99984 17.5C9.07936 17.5 8.33317 16.7538 8.33317 15.8333C8.33317 14.9129 9.07936 14.1667 9.99984 14.1667C10.9203 14.1667 11.6665 14.9129 11.6665 15.8333C11.6665 16.7538 10.9203 17.5 9.99984 17.5Z"
          fill="#242424"
        />
      </g>
    </svg>
  );
};
export const SmartPhone = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0516 2H11.9484C10.2682 1.99999 8.93732 1.99997 7.89575 2.14245C6.82382 2.28908 5.95621 2.59803 5.27199 3.29418C4.58778 3.99033 4.28413 4.87308 4.14001 5.9637C3.99997 7.02343 3.99999 8.37751 4 10.087V13.9129C3.99999 15.6225 3.99997 16.9766 4.14001 18.0363C4.28413 19.1269 4.58778 20.0097 5.27199 20.7058C5.95621 21.402 6.82382 21.7109 7.89575 21.8575C8.93731 22 10.2682 22 11.9484 22H12.0516C13.7318 22 15.0627 22 16.1043 21.8575C17.1762 21.7109 18.0438 21.402 18.728 20.7058C19.4122 20.0097 19.7159 19.1269 19.86 18.0363C20 16.9766 20 15.6225 20 13.913V10.0871C20 8.37754 20 7.02343 19.86 5.9637C19.7159 4.87308 19.4122 3.99033 18.728 3.29418C18.0438 2.59803 17.1762 2.28908 16.1043 2.14245C15.0627 1.99997 13.7318 1.99999 12.0516 2ZM8.57143 18.5116C8.57143 18.1263 8.87843 17.814 9.25714 17.814H14.7429C15.1216 17.814 15.4286 18.1263 15.4286 18.5116C15.4286 18.8969 15.1216 19.2093 14.7429 19.2093H9.25714C8.87843 19.2093 8.57143 18.8969 8.57143 18.5116Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PieChart = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6.22209 4.60105C6.66665 4.304 7.13344 4.04636 7.6171 3.82976C8.98898 3.21539 9.67491 2.9082 10.5875 3.4994C11.5 4.09061 11.5 5.06041 11.5 7.00001V8.50001C11.5 10.3856 11.5 11.3284 12.0858 11.9142C12.6716 12.5 13.6144 12.5 15.5 12.5H17C18.9396 12.5 19.9094 12.5 20.5006 13.4125C21.0918 14.3251 20.7846 15.011 20.1702 16.3829C19.9536 16.8666 19.696 17.3334 19.399 17.7779C18.3551 19.3402 16.8714 20.5578 15.1355 21.2769C13.3996 21.9959 11.4895 22.184 9.64665 21.8175C7.80383 21.4509 6.11109 20.5461 4.78249 19.2175C3.45389 17.8889 2.5491 16.1962 2.18254 14.3534C1.81598 12.5105 2.00412 10.6004 2.72315 8.86451C3.44218 7.12861 4.65982 5.64492 6.22209 4.60105Z"
        fill="currentColor"
      />
      <path
        d="M21.446 7.06901C20.6342 5.00831 18.9917 3.36579 16.931 2.55398C15.3895 1.94669 14 3.34316 14 5.00002V9.00002C14 9.5523 14.4477 10 15 10H19C20.6569 10 22.0533 8.61055 21.446 7.06901Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Settings = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <rect width="24" height="24" rx="5" fill="none" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.2788 2.15224C13.9085 2 13.439 2 12.5 2C11.561 2 11.0915 2 10.7212 2.15224C10.2274 2.35523 9.83509 2.74458 9.63056 3.23463C9.53719 3.45834 9.50065 3.7185 9.48635 4.09799C9.46534 4.65568 9.17716 5.17189 8.69017 5.45093C8.20318 5.72996 7.60864 5.71954 7.11149 5.45876C6.77318 5.2813 6.52789 5.18262 6.28599 5.15102C5.75609 5.08178 5.22018 5.22429 4.79616 5.5472C4.47814 5.78938 4.24339 6.1929 3.7739 6.99993C3.30441 7.80697 3.06967 8.21048 3.01735 8.60491C2.94758 9.1308 3.09118 9.66266 3.41655 10.0835C3.56506 10.2756 3.77377 10.437 4.0977 10.639C4.57391 10.936 4.88032 11.4419 4.88029 12C4.88026 12.5581 4.57386 13.0639 4.0977 13.3608C3.77372 13.5629 3.56497 13.7244 3.41645 13.9165C3.09108 14.3373 2.94749 14.8691 3.01725 15.395C3.06957 15.7894 3.30432 16.193 3.7738 17C4.24329 17.807 4.47804 18.2106 4.79606 18.4527C5.22008 18.7756 5.75599 18.9181 6.28589 18.8489C6.52778 18.8173 6.77305 18.7186 7.11133 18.5412C7.60852 18.2804 8.2031 18.27 8.69012 18.549C9.17714 18.8281 9.46533 19.3443 9.48635 19.9021C9.50065 20.2815 9.53719 20.5417 9.63056 20.7654C9.83509 21.2554 10.2274 21.6448 10.7212 21.8478C11.0915 22 11.561 22 12.5 22C13.439 22 13.9085 22 14.2788 21.8478C14.7726 21.6448 15.1649 21.2554 15.3694 20.7654C15.4628 20.5417 15.4994 20.2815 15.5137 19.902C15.5347 19.3443 15.8228 18.8281 16.3098 18.549C16.7968 18.2699 17.3914 18.2804 17.8886 18.5412C18.2269 18.7186 18.4721 18.8172 18.714 18.8488C19.2439 18.9181 19.7798 18.7756 20.2038 18.4527C20.5219 18.2105 20.7566 17.807 21.2261 16.9999C21.6956 16.1929 21.9303 15.7894 21.9827 15.395C22.0524 14.8691 21.9088 14.3372 21.5835 13.9164C21.4349 13.7243 21.2262 13.5628 20.9022 13.3608C20.4261 13.0639 20.1197 12.558 20.1197 11.9999C20.1197 11.4418 20.4261 10.9361 20.9022 10.6392C21.2263 10.4371 21.435 10.2757 21.5836 10.0835C21.9089 9.66273 22.0525 9.13087 21.9828 8.60497C21.9304 8.21055 21.6957 7.80703 21.2262 7C20.7567 6.19297 20.522 5.78945 20.2039 5.54727C19.7799 5.22436 19.244 5.08185 18.7141 5.15109C18.4722 5.18269 18.2269 5.28136 17.8887 5.4588C17.3915 5.71959 16.7969 5.73002 16.3099 5.45096C15.8229 5.17191 15.5347 4.65566 15.5136 4.09794C15.4993 3.71848 15.4628 3.45833 15.3694 3.23463C15.1649 2.74458 14.7726 2.35523 14.2788 2.15224ZM12.5 15C14.1695 15 15.5228 13.6569 15.5228 12C15.5228 10.3431 14.1695 9 12.5 9C10.8305 9 9.47716 10.3431 9.47716 12C9.47716 13.6569 10.8305 15 12.5 15Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SquareArrow = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355C22 19.0711 22 16.714 22 12C22 7.28595 22 4.92893 20.5355 3.46447C19.0711 2 16.714 2 12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355ZM9.96967 15.5303C9.67678 15.2374 9.67678 14.7626 9.96967 14.4697L12.4393 12L9.96967 9.53033C9.67678 9.23744 9.67678 8.76256 9.96967 8.46967C10.2626 8.17678 10.7374 8.17678 11.0303 8.46967L14.0303 11.4697C14.171 11.6103 14.25 11.8011 14.25 12C14.25 12.1989 14.171 12.3897 14.0303 12.5303L11.0303 15.5303C10.7374 15.8232 10.2626 15.8232 9.96967 15.5303Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Bag = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <g>
        <path
          d="M3.11801 17.1288C4.1177 18.3333 5.97829 18.3333 9.69946 18.3333H10.3004C14.0216 18.3333 15.8822 18.3333 16.8819 17.1288M3.11801 17.1288C2.11833 15.9242 2.46121 14.0955 3.14698 10.4381C3.63467 7.8371 3.87851 6.53661 4.80426 5.7683M3.11801 17.1288C3.11801 17.1288 3.11801 17.1288 3.11801 17.1288ZM16.8819 17.1288C17.8816 15.9242 17.5387 14.0955 16.8529 10.4381C16.3652 7.8371 16.1214 6.53661 15.1957 5.7683M16.8819 17.1288C16.8819 17.1288 16.8819 17.1288 16.8819 17.1288ZM15.1957 5.7683C14.2699 5 12.9468 5 10.3004 5H9.69946C7.05316 5 5.73 5 4.80426 5.7683M15.1957 5.7683C15.1957 5.7683 15.1957 5.7683 15.1957 5.7683ZM4.80426 5.7683C4.80426 5.7683 4.80426 5.7683 4.80426 5.7683Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7.5 4.99999V4.16666C7.5 2.78594 8.61929 1.66666 10 1.66666C11.3807 1.66666 12.5 2.78594 12.5 4.16666V4.99999"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const CallCancel = ({ className }: IconProps) => {
  return (
    <svg
      data-v-39ea7f52=""
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m16 2 6 6"></path>
      <path d="m22 2-6 6"></path>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
    </svg>
  );
};
export const Microphone = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4 9C4.41421 9 4.75 9.33579 4.75 9.75V10.75C4.75 14.7541 7.99594 18 12 18C16.0041 18 19.25 14.7541 19.25 10.75V9.75C19.25 9.33579 19.5858 9 20 9C20.4142 9 20.75 9.33579 20.75 9.75V10.75C20.75 15.3298 17.2314 19.0879 12.75 19.4683V21.75C12.75 22.1642 12.4142 22.5 12 22.5C11.5858 22.5 11.25 22.1642 11.25 21.75V19.4683C6.7686 19.0879 3.25 15.3298 3.25 10.75V9.75C3.25 9.33579 3.58579 9 4 9Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C8.82436 2 6.25 4.57436 6.25 7.75V10.75C6.25 13.9256 8.82436 16.5 12 16.5C15.1756 16.5 17.75 13.9256 17.75 10.75V7.75C17.75 4.57436 15.1756 2 12 2ZM14 11.5C14.4142 11.5 14.75 11.1642 14.75 10.75C14.75 10.3358 14.4142 10 14 10H10C9.58579 10 9.25 10.3358 9.25 10.75C9.25 11.1642 9.58579 11.5 10 11.5H14ZM13.75 7.75C13.75 8.16421 13.4142 8.5 13 8.5H11C10.5858 8.5 10.25 8.16421 10.25 7.75C10.25 7.33579 10.5858 7 11 7H13C13.4142 7 13.75 7.33579 13.75 7.75Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Dialpad = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <mask id="path-1-inside-1_995_2922" fill="currentColor">
        <path d="M7 6.2C6.46957 6.2 5.96086 5.97875 5.58579 5.58492C5.21071 5.1911 5 4.65695 5 4.1C5 3.54305 5.21071 3.0089 5.58579 2.61508C5.96086 2.22125 6.46957 2 7 2C7.53043 2 8.03914 2.22125 8.41421 2.61508C8.78929 3.0089 9 3.54305 9 4.1C9 4.65695 8.78929 5.1911 8.41421 5.58492C8.03914 5.97875 7.53043 6.2 7 6.2ZM12 6.2C11.4696 6.2 10.9609 5.97875 10.5858 5.58492C10.2107 5.1911 10 4.65695 10 4.1C10 3.54305 10.2107 3.0089 10.5858 2.61508C10.9609 2.22125 11.4696 2 12 2C12.5304 2 13.0391 2.22125 13.4142 2.61508C13.7893 3.0089 14 3.54305 14 4.1C14 4.65695 13.7893 5.1911 13.4142 5.58492C13.0391 5.97875 12.5304 6.2 12 6.2ZM17 6.2C16.4696 6.2 15.9609 5.97875 15.5858 5.58492C15.2107 5.1911 15 4.65695 15 4.1C15 3.54305 15.2107 3.0089 15.5858 2.61508C15.9609 2.22125 16.4696 2 17 2C17.5304 2 18.0391 2.22125 18.4142 2.61508C18.7893 3.0089 19 3.54305 19 4.1C19 4.65695 18.7893 5.1911 18.4142 5.58492C18.0391 5.97875 17.5304 6.2 17 6.2ZM7 11.45C6.46957 11.45 5.96086 11.2288 5.58579 10.8349C5.21071 10.4411 5 9.90695 5 9.35C5 8.79305 5.21071 8.2589 5.58579 7.86508C5.96086 7.47125 6.46957 7.25 7 7.25C7.53043 7.25 8.03914 7.47125 8.41421 7.86508C8.78929 8.2589 9 8.79305 9 9.35C9 9.90695 8.78929 10.4411 8.41421 10.8349C8.03914 11.2288 7.53043 11.45 7 11.45ZM12 11.45C11.4696 11.45 10.9609 11.2288 10.5858 10.8349C10.2107 10.4411 10 9.90695 10 9.35C10 8.79305 10.2107 8.2589 10.5858 7.86508C10.9609 7.47125 11.4696 7.25 12 7.25C12.5304 7.25 13.0391 7.47125 13.4142 7.86508C13.7893 8.2589 14 8.79305 14 9.35C14 9.90695 13.7893 10.4411 13.4142 10.8349C13.0391 11.2288 12.5304 11.45 12 11.45ZM17 11.45C16.4696 11.45 15.9609 11.2288 15.5858 10.8349C15.2107 10.4411 15 9.90695 15 9.35C15 8.79305 15.2107 8.2589 15.5858 7.86508C15.9609 7.47125 16.4696 7.25 17 7.25C17.5304 7.25 18.0391 7.47125 18.4142 7.86508C18.7893 8.2589 19 8.79305 19 9.35C19 9.90695 18.7893 10.4411 18.4142 10.8349C18.0391 11.2288 17.5304 11.45 17 11.45ZM7 16.7C6.46957 16.7 5.96086 16.4787 5.58579 16.0849C5.21071 15.6911 5 15.157 5 14.6C5 14.043 5.21071 13.5089 5.58579 13.1151C5.96086 12.7212 6.46957 12.5 7 12.5C7.53043 12.5 8.03914 12.7212 8.41421 13.1151C8.78929 13.5089 9 14.043 9 14.6C9 15.157 8.78929 15.6911 8.41421 16.0849C8.03914 16.4787 7.53043 16.7 7 16.7ZM12 16.7C11.4696 16.7 10.9609 16.4787 10.5858 16.0849C10.2107 15.6911 10 15.157 10 14.6C10 14.043 10.2107 13.5089 10.5858 13.1151C10.9609 12.7212 11.4696 12.5 12 12.5C12.5304 12.5 13.0391 12.7212 13.4142 13.1151C13.7893 13.5089 14 14.043 14 14.6C14 15.157 13.7893 15.6911 13.4142 16.0849C13.0391 16.4787 12.5304 16.7 12 16.7ZM12 23C11.4696 23 10.9609 22.7787 10.5858 22.3849C10.2107 21.9911 10 21.457 10 20.9C10 20.343 10.2107 19.8089 10.5858 19.4151C10.9609 19.0212 11.4696 18.8 12 18.8C12.5304 18.8 13.0391 19.0212 13.4142 19.4151C13.7893 19.8089 14 20.343 14 20.9C14 21.457 13.7893 21.9911 13.4142 22.3849C13.0391 22.7787 12.5304 23 12 23ZM17 16.7C16.4696 16.7 15.9609 16.4787 15.5858 16.0849C15.2107 15.6911 15 15.157 15 14.6C15 14.043 15.2107 13.5089 15.5858 13.1151C15.9609 12.7212 16.4696 12.5 17 12.5C17.5304 12.5 18.0391 12.7212 18.4142 13.1151C18.7893 13.5089 19 14.043 19 14.6C19 15.157 18.7893 15.6911 18.4142 16.0849C18.0391 16.4787 17.5304 16.7 17 16.7Z" />
      </mask>
      <path
        d="M7 6.2C6.46957 6.2 5.96086 5.97875 5.58579 5.58492C5.21071 5.1911 5 4.65695 5 4.1C5 3.54305 5.21071 3.0089 5.58579 2.61508C5.96086 2.22125 6.46957 2 7 2C7.53043 2 8.03914 2.22125 8.41421 2.61508C8.78929 3.0089 9 3.54305 9 4.1C9 4.65695 8.78929 5.1911 8.41421 5.58492C8.03914 5.97875 7.53043 6.2 7 6.2ZM12 6.2C11.4696 6.2 10.9609 5.97875 10.5858 5.58492C10.2107 5.1911 10 4.65695 10 4.1C10 3.54305 10.2107 3.0089 10.5858 2.61508C10.9609 2.22125 11.4696 2 12 2C12.5304 2 13.0391 2.22125 13.4142 2.61508C13.7893 3.0089 14 3.54305 14 4.1C14 4.65695 13.7893 5.1911 13.4142 5.58492C13.0391 5.97875 12.5304 6.2 12 6.2ZM17 6.2C16.4696 6.2 15.9609 5.97875 15.5858 5.58492C15.2107 5.1911 15 4.65695 15 4.1C15 3.54305 15.2107 3.0089 15.5858 2.61508C15.9609 2.22125 16.4696 2 17 2C17.5304 2 18.0391 2.22125 18.4142 2.61508C18.7893 3.0089 19 3.54305 19 4.1C19 4.65695 18.7893 5.1911 18.4142 5.58492C18.0391 5.97875 17.5304 6.2 17 6.2ZM7 11.45C6.46957 11.45 5.96086 11.2288 5.58579 10.8349C5.21071 10.4411 5 9.90695 5 9.35C5 8.79305 5.21071 8.2589 5.58579 7.86508C5.96086 7.47125 6.46957 7.25 7 7.25C7.53043 7.25 8.03914 7.47125 8.41421 7.86508C8.78929 8.2589 9 8.79305 9 9.35C9 9.90695 8.78929 10.4411 8.41421 10.8349C8.03914 11.2288 7.53043 11.45 7 11.45ZM12 11.45C11.4696 11.45 10.9609 11.2288 10.5858 10.8349C10.2107 10.4411 10 9.90695 10 9.35C10 8.79305 10.2107 8.2589 10.5858 7.86508C10.9609 7.47125 11.4696 7.25 12 7.25C12.5304 7.25 13.0391 7.47125 13.4142 7.86508C13.7893 8.2589 14 8.79305 14 9.35C14 9.90695 13.7893 10.4411 13.4142 10.8349C13.0391 11.2288 12.5304 11.45 12 11.45ZM17 11.45C16.4696 11.45 15.9609 11.2288 15.5858 10.8349C15.2107 10.4411 15 9.90695 15 9.35C15 8.79305 15.2107 8.2589 15.5858 7.86508C15.9609 7.47125 16.4696 7.25 17 7.25C17.5304 7.25 18.0391 7.47125 18.4142 7.86508C18.7893 8.2589 19 8.79305 19 9.35C19 9.90695 18.7893 10.4411 18.4142 10.8349C18.0391 11.2288 17.5304 11.45 17 11.45ZM7 16.7C6.46957 16.7 5.96086 16.4787 5.58579 16.0849C5.21071 15.6911 5 15.157 5 14.6C5 14.043 5.21071 13.5089 5.58579 13.1151C5.96086 12.7212 6.46957 12.5 7 12.5C7.53043 12.5 8.03914 12.7212 8.41421 13.1151C8.78929 13.5089 9 14.043 9 14.6C9 15.157 8.78929 15.6911 8.41421 16.0849C8.03914 16.4787 7.53043 16.7 7 16.7ZM12 16.7C11.4696 16.7 10.9609 16.4787 10.5858 16.0849C10.2107 15.6911 10 15.157 10 14.6C10 14.043 10.2107 13.5089 10.5858 13.1151C10.9609 12.7212 11.4696 12.5 12 12.5C12.5304 12.5 13.0391 12.7212 13.4142 13.1151C13.7893 13.5089 14 14.043 14 14.6C14 15.157 13.7893 15.6911 13.4142 16.0849C13.0391 16.4787 12.5304 16.7 12 16.7ZM12 23C11.4696 23 10.9609 22.7787 10.5858 22.3849C10.2107 21.9911 10 21.457 10 20.9C10 20.343 10.2107 19.8089 10.5858 19.4151C10.9609 19.0212 11.4696 18.8 12 18.8C12.5304 18.8 13.0391 19.0212 13.4142 19.4151C13.7893 19.8089 14 20.343 14 20.9C14 21.457 13.7893 21.9911 13.4142 22.3849C13.0391 22.7787 12.5304 23 12 23ZM17 16.7C16.4696 16.7 15.9609 16.4787 15.5858 16.0849C15.2107 15.6911 15 15.157 15 14.6C15 14.043 15.2107 13.5089 15.5858 13.1151C15.9609 12.7212 16.4696 12.5 17 12.5C17.5304 12.5 18.0391 12.7212 18.4142 13.1151C18.7893 13.5089 19 14.043 19 14.6C19 15.157 18.7893 15.6911 18.4142 16.0849C18.0391 16.4787 17.5304 16.7 17 16.7Z"
        fill="currentColor"
      />
      <path
        d="M7 6.2V46.2V6.2ZM5 4.1H-35H5ZM7 2V-38V2ZM9 4.1H49H9ZM12 6.2V46.2V6.2ZM12 2V-38V2ZM17 6.2V46.2V6.2ZM17 2V-38V2ZM5 9.35L-35 9.35L5 9.35ZM7 7.25V-32.75V7.25ZM9 9.35H49H9ZM12 7.25V-32.75V7.25ZM17 7.25V-32.75V7.25ZM5 14.6H-35H5ZM7 12.5V52.5V12.5ZM9 14.6H49H9ZM12 12.5V52.5V12.5ZM12 18.8V58.8V18.8ZM17 12.5V52.5V12.5ZM7 -33.8C17.7254 -33.8 27.5923 -29.3083 34.5513 -22.0013L-23.3797 33.1711C-15.6706 41.2658 -4.78626 46.2 7 46.2V-33.8ZM34.5513 -22.0013C41.4472 -14.7606 45 -5.33907 45 4.1H-35C-35 14.653 -31.0257 25.1428 -23.3797 33.1711L34.5513 -22.0013ZM45 4.1C45 13.5391 41.4472 22.9606 34.5513 30.2013L-23.3797 -24.9711C-31.0257 -16.9428 -35 -6.45298 -35 4.1H45ZM34.5513 30.2013C27.5923 37.5083 17.7254 42 7 42V-38C-4.78627 -38 -15.6706 -33.0658 -23.3797 -24.9711L34.5513 30.2013ZM7 42C-3.7254 42 -13.5923 37.5083 -20.5513 30.2013L37.3797 -24.9711C29.6706 -33.0658 18.7863 -38 7 -38V42ZM-20.5513 30.2013C-27.4472 22.9606 -31 13.5391 -31 4.1H49C49 -6.45298 45.0257 -16.9428 37.3797 -24.9711L-20.5513 30.2013ZM-31 4.1C-31 -5.33907 -27.4472 -14.7606 -20.5513 -22.0013L37.3797 33.1711C45.0257 25.1428 49 14.653 49 4.1H-31ZM-20.5513 -22.0013C-13.5923 -29.3083 -3.7254 -33.8 7 -33.8V46.2C18.7863 46.2 29.6706 41.2658 37.3797 33.1711L-20.5513 -22.0013ZM12 -33.8C22.7254 -33.8 32.5923 -29.3083 39.5513 -22.0013L-18.3797 33.1711C-10.6706 41.2658 0.213725 46.2 12 46.2V-33.8ZM39.5513 -22.0013C46.4471 -14.7606 50 -5.33909 50 4.1H-30C-30 14.653 -26.0257 25.1428 -18.3797 33.1711L39.5513 -22.0013ZM50 4.1C50 13.5391 46.4471 22.9607 39.5513 30.2013L-18.3797 -24.9711C-26.0257 -16.9428 -30 -6.453 -30 4.1H50ZM39.5513 30.2013C32.5923 37.5082 22.7254 42 12 42V-38C0.213719 -38 -10.6706 -33.0657 -18.3797 -24.9711L39.5513 30.2013ZM12 42C1.27458 42 -8.59229 37.5082 -15.5513 30.2013L42.3797 -24.9711C34.6706 -33.0657 23.7863 -38 12 -38V42ZM-15.5513 30.2013C-22.4471 22.9607 -26 13.5391 -26 4.1H54C54 -6.453 50.0257 -16.9428 42.3797 -24.9711L-15.5513 30.2013ZM-26 4.1C-26 -5.33909 -22.4471 -14.7606 -15.5513 -22.0013L42.3797 33.1711C50.0257 25.1428 54 14.653 54 4.1H-26ZM-15.5513 -22.0013C-8.59229 -29.3083 1.27459 -33.8 12 -33.8V46.2C23.7863 46.2 34.6706 41.2658 42.3797 33.1711L-15.5513 -22.0013ZM17 -33.8C27.7254 -33.8 37.5923 -29.3083 44.5513 -22.0013L-13.3797 33.1711C-5.67057 41.2658 5.21373 46.2 17 46.2V-33.8ZM44.5513 -22.0013C51.4471 -14.7606 55 -5.33909 55 4.1H-25C-25 14.653 -21.0257 25.1428 -13.3797 33.1711L44.5513 -22.0013ZM55 4.1C55 13.5391 51.4471 22.9607 44.5513 30.2013L-13.3797 -24.9711C-21.0257 -16.9428 -25 -6.453 -25 4.1H55ZM44.5513 30.2013C37.5923 37.5082 27.7254 42 17 42V-38C5.21372 -38 -5.67057 -33.0657 -13.3797 -24.9711L44.5513 30.2013ZM17 42C6.27458 42 -3.59229 37.5082 -10.5513 30.2013L47.3797 -24.9711C39.6706 -33.0657 28.7863 -38 17 -38V42ZM-10.5513 30.2013C-17.4471 22.9607 -21 13.5391 -21 4.1H59C59 -6.453 55.0257 -16.9428 47.3797 -24.9711L-10.5513 30.2013ZM-21 4.1C-21 -5.33909 -17.4471 -14.7606 -10.5513 -22.0013L47.3797 33.1711C55.0257 25.1428 59 14.653 59 4.1H-21ZM-10.5513 -22.0013C-3.59229 -29.3083 6.27459 -33.8 17 -33.8V46.2C28.7863 46.2 39.6706 41.2658 47.3797 33.1711L-10.5513 -22.0013ZM7 -28.55C17.7254 -28.55 27.5923 -24.0582 34.5513 -16.7513L-23.3797 38.4211C-15.6706 46.5157 -4.78629 51.45 7 51.45V-28.55ZM34.5513 -16.7513C41.4472 -9.51064 45 -0.0890756 45 9.35L-35 9.35C-35 19.903 -31.0257 30.3928 -23.3797 38.4211L34.5513 -16.7513ZM45 9.35C45 18.7891 41.4472 28.2106 34.5513 35.4513L-23.3797 -19.7211C-31.0257 -11.6928 -35 -1.20298 -35 9.35H45ZM34.5513 35.4513C27.5923 42.7583 17.7254 47.25 7 47.25V-32.75C-4.78626 -32.75 -15.6706 -27.8158 -23.3797 -19.7211L34.5513 35.4513ZM7 47.25C-3.7254 47.25 -13.5923 42.7583 -20.5513 35.4513L37.3797 -19.7211C29.6706 -27.8158 18.7863 -32.75 7 -32.75V47.25ZM-20.5513 35.4513C-27.4472 28.2106 -31 18.7891 -31 9.35L49 9.35C49 -1.20298 45.0257 -11.6928 37.3797 -19.7211L-20.5513 35.4513ZM-31 9.35C-31 -0.0890756 -27.4472 -9.51064 -20.5513 -16.7513L37.3797 38.4211C45.0257 30.3928 49 19.903 49 9.35L-31 9.35ZM-20.5513 -16.7513C-13.5923 -24.0582 -3.72542 -28.55 7 -28.55V51.45C18.7863 51.45 29.6706 46.5157 37.3797 38.4211L-20.5513 -16.7513ZM12 -28.55C22.7254 -28.55 32.5923 -24.0582 39.5513 -16.7513L-18.3797 38.4211C-10.6706 46.5157 0.2137 51.45 12 51.45V-28.55ZM39.5513 -16.7513C46.4471 -9.51066 50 -0.0890992 50 9.35H-30C-30 19.903 -26.0257 30.3929 -18.3797 38.4211L39.5513 -16.7513ZM50 9.35C50 18.7891 46.4471 28.2106 39.5513 35.4513L-18.3797 -19.7211C-26.0257 -11.6928 -30 -1.203 -30 9.35H50ZM39.5513 35.4513C32.5923 42.7583 22.7254 47.25 12 47.25V-32.75C0.213725 -32.75 -10.6706 -27.8158 -18.3797 -19.7211L39.5513 35.4513ZM12 47.25C1.27459 47.25 -8.59229 42.7583 -15.5513 35.4513L42.3797 -19.7211C34.6706 -27.8158 23.7863 -32.75 12 -32.75V47.25ZM-15.5513 35.4513C-22.4471 28.2106 -26 18.7891 -26 9.35H54C54 -1.203 50.0257 -11.6928 42.3797 -19.7211L-15.5513 35.4513ZM-26 9.35C-26 -0.0890992 -22.4471 -9.51066 -15.5513 -16.7513L42.3797 38.4211C50.0257 30.3929 54 19.903 54 9.35H-26ZM-15.5513 -16.7513C-8.5923 -24.0582 1.27457 -28.55 12 -28.55V51.45C23.7863 51.45 34.6706 46.5157 42.3797 38.4211L-15.5513 -16.7513ZM17 -28.55C27.7254 -28.55 37.5923 -24.0582 44.5513 -16.7513L-13.3797 38.4211C-5.67058 46.5157 5.2137 51.45 17 51.45V-28.55ZM44.5513 -16.7513C51.4471 -9.51066 55 -0.0890992 55 9.35H-25C-25 19.903 -21.0257 30.3929 -13.3797 38.4211L44.5513 -16.7513ZM55 9.35C55 18.7891 51.4471 28.2106 44.5513 35.4513L-13.3797 -19.7211C-21.0257 -11.6928 -25 -1.203 -25 9.35H55ZM44.5513 35.4513C37.5923 42.7583 27.7254 47.25 17 47.25V-32.75C5.21373 -32.75 -5.67057 -27.8158 -13.3797 -19.7211L44.5513 35.4513ZM17 47.25C6.27459 47.25 -3.59229 42.7583 -10.5513 35.4513L47.3797 -19.7211C39.6706 -27.8158 28.7863 -32.75 17 -32.75V47.25ZM-10.5513 35.4513C-17.4471 28.2106 -21 18.7891 -21 9.35H59C59 -1.203 55.0257 -11.6928 47.3797 -19.7211L-10.5513 35.4513ZM-21 9.35C-21 -0.0890992 -17.4471 -9.51066 -10.5513 -16.7513L47.3797 38.4211C55.0257 30.3929 59 19.903 59 9.35H-21ZM-10.5513 -16.7513C-3.5923 -24.0582 6.27457 -28.55 17 -28.55V51.45C28.7863 51.45 39.6706 46.5157 47.3797 38.4211L-10.5513 -16.7513ZM7 -23.3C17.7254 -23.3 27.5923 -18.8082 34.5513 -11.5013L-23.3797 43.6711C-15.6706 51.7657 -4.78629 56.7 7 56.7V-23.3ZM34.5513 -11.5013C41.4472 -4.26064 45 5.16092 45 14.6H-35C-35 25.153 -31.0257 35.6428 -23.3797 43.6711L34.5513 -11.5013ZM45 14.6C45 24.0391 41.4472 33.4606 34.5513 40.7013L-23.3797 -14.4711C-31.0257 -6.44283 -35 4.04701 -35 14.6H45ZM34.5513 40.7013C27.5923 48.0082 17.7254 52.5 7 52.5V-27.5C-4.78629 -27.5 -15.6706 -22.5657 -23.3797 -14.4711L34.5513 40.7013ZM7 52.5C-3.72542 52.5 -13.5923 48.0082 -20.5513 40.7013L37.3797 -14.4711C29.6706 -22.5657 18.7863 -27.5 7 -27.5V52.5ZM-20.5513 40.7013C-27.4472 33.4606 -31 24.0391 -31 14.6H49C49 4.04701 45.0257 -6.44283 37.3797 -14.4711L-20.5513 40.7013ZM-31 14.6C-31 5.16092 -27.4472 -4.26064 -20.5513 -11.5013L37.3797 43.6711C45.0257 35.6428 49 25.153 49 14.6H-31ZM-20.5513 -11.5013C-13.5923 -18.8082 -3.72542 -23.3 7 -23.3V56.7C18.7863 56.7 29.6706 51.7657 37.3797 43.6711L-20.5513 -11.5013ZM12 -23.3C22.7254 -23.3 32.5923 -18.8082 39.5513 -11.5013L-18.3797 43.6711C-10.6706 51.7657 0.2137 56.7 12 56.7V-23.3ZM39.5513 -11.5013C46.4471 -4.26066 50 5.1609 50 14.6H-30C-30 25.153 -26.0257 35.6428 -18.3797 43.6711L39.5513 -11.5013ZM50 14.6C50 24.0391 46.4471 33.4607 39.5513 40.7013L-18.3797 -14.4711C-26.0257 -6.44285 -30 4.04699 -30 14.6H50ZM39.5513 40.7013C32.5923 48.0082 22.7254 52.5 12 52.5V-27.5C0.2137 -27.5 -10.6706 -22.5657 -18.3797 -14.4711L39.5513 40.7013ZM12 52.5C1.27457 52.5 -8.5923 48.0082 -15.5513 40.7013L42.3797 -14.4711C34.6706 -22.5657 23.7863 -27.5 12 -27.5V52.5ZM-15.5513 40.7013C-22.4471 33.4607 -26 24.0391 -26 14.6H54C54 4.04699 50.0257 -6.44285 42.3797 -14.4711L-15.5513 40.7013ZM-26 14.6C-26 5.1609 -22.4471 -4.26066 -15.5513 -11.5013L42.3797 43.6711C50.0257 35.6428 54 25.153 54 14.6H-26ZM-15.5513 -11.5013C-8.5923 -18.8082 1.27457 -23.3 12 -23.3V56.7C23.7863 56.7 34.6706 51.7657 42.3797 43.6711L-15.5513 -11.5013ZM12 -17C22.7254 -17 32.5923 -12.5082 39.5513 -5.20128L-18.3797 49.9711C-10.6706 58.0657 0.2137 63 12 63V-17ZM39.5513 -5.20128C46.4471 2.03934 50 11.4609 50 20.9H-30C-30 31.453 -26.0257 41.9429 -18.3797 49.9711L39.5513 -5.20128ZM50 20.9C50 30.3391 46.4471 39.7607 39.5513 47.0013L-18.3797 -8.17113C-26.0257 -0.142852 -30 10.347 -30 20.9H50ZM39.5513 47.0013C32.5923 54.3082 22.7254 58.8 12 58.8V-21.2C0.2137 -21.2 -10.6706 -16.2657 -18.3797 -8.17113L39.5513 47.0013ZM12 58.8C1.27457 58.8 -8.5923 54.3082 -15.5513 47.0013L42.3797 -8.17113C34.6706 -16.2657 23.7863 -21.2 12 -21.2V58.8ZM-15.5513 47.0013C-22.4471 39.7607 -26 30.3391 -26 20.9H54C54 10.347 50.0257 -0.142852 42.3797 -8.17113L-15.5513 47.0013ZM-26 20.9C-26 11.4609 -22.4471 2.03934 -15.5513 -5.20128L42.3797 49.9711C50.0257 41.9429 54 31.453 54 20.9H-26ZM-15.5513 -5.20128C-8.5923 -12.5082 1.27457 -17 12 -17V63C23.7863 63 34.6706 58.0657 42.3797 49.9711L-15.5513 -5.20128ZM17 -23.3C27.7254 -23.3 37.5923 -18.8082 44.5513 -11.5013L-13.3797 43.6711C-5.67058 51.7657 5.2137 56.7 17 56.7V-23.3ZM44.5513 -11.5013C51.4471 -4.26066 55 5.1609 55 14.6H-25C-25 25.153 -21.0257 35.6428 -13.3797 43.6711L44.5513 -11.5013ZM55 14.6C55 24.0391 51.4471 33.4607 44.5513 40.7013L-13.3797 -14.4711C-21.0257 -6.44285 -25 4.04699 -25 14.6H55ZM44.5513 40.7013C37.5923 48.0082 27.7254 52.5 17 52.5V-27.5C5.2137 -27.5 -5.67058 -22.5657 -13.3797 -14.4711L44.5513 40.7013ZM17 52.5C6.27457 52.5 -3.5923 48.0082 -10.5513 40.7013L47.3797 -14.4711C39.6706 -22.5657 28.7863 -27.5 17 -27.5V52.5ZM-10.5513 40.7013C-17.4471 33.4607 -21 24.0391 -21 14.6H59C59 4.04699 55.0257 -6.44285 47.3797 -14.4711L-10.5513 40.7013ZM-21 14.6C-21 5.1609 -17.4471 -4.26066 -10.5513 -11.5013L47.3797 43.6711C55.0257 35.6428 59 25.153 59 14.6H-21ZM-10.5513 -11.5013C-3.5923 -18.8082 6.27457 -23.3 17 -23.3V56.7C28.7863 56.7 39.6706 51.7657 47.3797 43.6711L-10.5513 -11.5013Z"
        fill="currentColor"
        mask="url(#path-1-inside-1_995_2922)"
      />
    </svg>
  );
};
export const CallerIdIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M0.75 0.5H5.42308V5.17308H0.75V0.5Z" fill="currentColor" />
      <path d="M0.75 8.28857H5.42308V12.9617H0.75V8.28857Z" fill="currentColor" />
      <path d="M0.75 16.0771V20.7502H5.42308V16.0771H0.75Z" fill="currentColor" />
      <path d="M8.53857 0.5H13.2117V5.17308H8.53857V0.5Z" fill="currentColor" />
      <path d="M8.53857 8.28857V12.9617H13.2117V8.28857H8.53857Z" fill="currentColor" />
      <path d="M8.53857 16.0771H13.2117V20.7502H8.53857V16.0771Z" fill="currentColor" />
      <path d="M16.3271 0.5H21.0002V5.17308H16.3271V0.5Z" fill="currentColor" />
      <path d="M16.3271 8.28857V12.9617H21.0002V8.28857H16.3271Z" fill="currentColor" />
      <path d="M16.3271 16.0771H21.0002V20.7502H16.3271V16.0771Z" fill="currentColor" />
    </svg>
  );
};

export const VolumeLoud = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M18.0003 16.7503C17.8403 16.7503 17.6903 16.7003 17.5503 16.6003C17.2203 16.3503 17.1503 15.8803 17.4003 15.5503C18.9703 13.4603 18.9703 10.5403 17.4003 8.45027C17.1503 8.12027 17.2203 7.65027 17.5503 7.40027C17.8803 7.15027 18.3503 7.22027 18.6003 7.55027C20.5603 10.1703 20.5603 13.8303 18.6003 16.4503C18.4503 16.6503 18.2303 16.7503 18.0003 16.7503Z"
        fill="currentColor"
      />
      <path
        d="M19.8284 19.2503C19.6684 19.2503 19.5184 19.2003 19.3784 19.1003C19.0484 18.8503 18.9784 18.3803 19.2284 18.0503C21.8984 14.4903 21.8984 9.51027 19.2284 5.95027C18.9784 5.62027 19.0484 5.15027 19.3784 4.90027C19.7084 4.65027 20.1784 4.72027 20.4284 5.05027C23.4984 9.14027 23.4984 14.8603 20.4284 18.9503C20.2884 19.1503 20.0584 19.2503 19.8284 19.2503Z"
        fill="currentColor"
      />
      <path
        d="M14.02 3.78168C12.9 3.16168 11.47 3.32168 10.01 4.23168L7.09 6.06168C6.89 6.18168 6.66 6.25168 6.43 6.25168H5.5H5C2.58 6.25168 1.25 7.58168 1.25 10.0017V14.0017C1.25 16.4217 2.58 17.7517 5 17.7517H5.5H6.43C6.66 17.7517 6.89 17.8217 7.09 17.9417L10.01 19.7717C10.89 20.3217 11.75 20.5917 12.55 20.5917C13.07 20.5917 13.57 20.4717 14.02 20.2217C15.13 19.6017 15.75 18.3117 15.75 16.5917V7.41168C15.75 5.69168 15.13 4.40168 14.02 3.78168Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const VolumeLoudOff = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M18.0003 16.7503C17.8403 16.7503 17.6903 16.7003 17.5503 16.6003C17.2203 16.3503 17.1503 15.8803 17.4003 15.5503C18.6603 13.8703 18.9303 11.6403 18.1203 9.71032C17.9603 9.33032 18.1403 8.89032 18.5203 8.73032C18.9003 8.57032 19.3403 8.75032 19.5003 9.13032C20.5203 11.5503 20.1703 14.3603 18.6003 16.4603C18.4503 16.6503 18.2303 16.7503 18.0003 16.7503Z"
        fill="currentColor"
      />
      <path
        d="M19.8284 19.2492C19.6684 19.2492 19.5184 19.1992 19.3784 19.0992C19.0484 18.8492 18.9784 18.3792 19.2284 18.0492C21.3684 15.1992 21.8384 11.3792 20.4584 8.08922C20.2984 7.70922 20.4784 7.26922 20.8584 7.10922C21.2384 6.94922 21.6784 7.12922 21.8384 7.50922C23.4284 11.2892 22.8884 15.6692 20.4284 18.9492C20.2884 19.1492 20.0584 19.2492 19.8284 19.2492Z"
        fill="currentColor"
      />
      <path
        d="M14.0366 12.9581C14.6666 12.3281 15.7466 12.7781 15.7466 13.6681V16.5981C15.7466 18.3181 15.1266 19.6081 14.0166 20.2281C13.5666 20.4781 13.0666 20.5981 12.5466 20.5981C11.7466 20.5981 10.8866 20.3281 10.0066 19.7781L9.36656 19.3781C8.82656 19.0381 8.73656 18.2781 9.18656 17.8281L14.0366 12.9581Z"
        fill="currentColor"
      />
      <path
        d="M21.77 2.22891C21.47 1.92891 20.98 1.92891 20.68 2.22891L15.73 7.17891C15.67 5.57891 15.07 4.37891 14.01 3.78891C12.89 3.16891 11.46 3.32891 10 4.23891L7.09 6.05891C6.89 6.17891 6.66 6.24891 6.43 6.24891H5.5H5C2.58 6.24891 1.25 7.57891 1.25 9.99891V13.9989C1.25 16.4189 2.58 17.7489 5 17.7489H5.16L2.22 20.6889C1.92 20.9889 1.92 21.4789 2.22 21.7789C2.38 21.9189 2.57 21.9989 2.77 21.9989C2.97 21.9989 3.16 21.9189 3.31 21.7689L21.77 3.30891C22.08 3.00891 22.08 2.52891 21.77 2.22891Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AddCircle = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const PauseCircle = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM8.07612 8.61732C8 8.80109 8 9.03406 8 9.5V14.5C8 14.9659 8 15.1989 8.07612 15.3827C8.17761 15.6277 8.37229 15.8224 8.61732 15.9239C8.80109 16 9.03406 16 9.5 16C9.96594 16 10.1989 16 10.3827 15.9239C10.6277 15.8224 10.8224 15.6277 10.9239 15.3827C11 15.1989 11 14.9659 11 14.5V9.5C11 9.03406 11 8.80109 10.9239 8.61732C10.8224 8.37229 10.6277 8.17761 10.3827 8.07612C10.1989 8 9.96594 8 9.5 8C9.03406 8 8.80109 8 8.61732 8.07612C8.37229 8.17761 8.17761 8.37229 8.07612 8.61732ZM13.0761 8.61732C13 8.80109 13 9.03406 13 9.5V14.5C13 14.9659 13 15.1989 13.0761 15.3827C13.1776 15.6277 13.3723 15.8224 13.6173 15.9239C13.8011 16 14.0341 16 14.5 16C14.9659 16 15.1989 16 15.3827 15.9239C15.6277 15.8224 15.8224 15.6277 15.9239 15.3827C16 15.1989 16 14.9659 16 14.5V9.5C16 9.03406 16 8.80109 15.9239 8.61732C15.8224 8.37229 15.6277 8.17761 15.3827 8.07612C15.1989 8 14.9659 8 14.5 8C14.0341 8 13.8011 8 13.6173 8.07612C13.3723 8.17761 13.1776 8.37229 13.0761 8.61732Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const ArrowRightUp = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          d="M5.46967 17.4697C5.17678 17.7626 5.17678 18.2374 5.46967 18.5303C5.76256 18.8232 6.23744 18.8232 6.53033 18.5303L13.5 11.5607L17.4697 15.5303C17.6842 15.7448 18.0068 15.809 18.287 15.6929C18.5673 15.5768 18.75 15.3033 18.75 15V6C18.75 5.58579 18.4142 5.25 18 5.25L9 5.25C8.69665 5.25 8.42318 5.43273 8.30709 5.71299C8.19101 5.99324 8.25517 6.31583 8.46967 6.53033L12.4393 10.5L5.46967 17.4697Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const RecordCircle = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          d="M8.75 12C8.75 10.2051 10.2051 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C10.2051 15.25 8.75 13.7949 8.75 12Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 7.25C9.37665 7.25 7.25 9.37665 7.25 12C7.25 14.6234 9.37665 16.75 12 16.75C14.6234 16.75 16.75 14.6234 16.75 12C16.75 9.37665 14.6234 7.25 12 7.25Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const DocumentAdd = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          d="M16.5189 16.5013C16.6939 16.3648 16.8526 16.2061 17.1701 15.8886L21.1275 11.9312C21.2231 11.8356 21.1793 11.6708 21.0515 11.6264C20.5844 11.4644 19.9767 11.1601 19.4083 10.5917C18.8399 10.0233 18.5356 9.41561 18.3736 8.94849C18.3292 8.82066 18.1644 8.77687 18.0688 8.87254L14.1114 12.8299C13.7939 13.1474 13.6352 13.3061 13.4987 13.4811C13.3377 13.6876 13.1996 13.9109 13.087 14.1473C12.9915 14.3476 12.9205 14.5606 12.7786 14.9865L12.5951 15.5368L12.3034 16.4118L12.0299 17.2323C11.9601 17.4419 12.0146 17.6729 12.1708 17.8292C12.3271 17.9854 12.5581 18.0399 12.7677 17.9701L13.5882 17.6966L14.4632 17.4049L15.0135 17.2214L15.0136 17.2214C15.4394 17.0795 15.6524 17.0085 15.8527 16.913C16.0891 16.8004 16.3124 16.6623 16.5189 16.5013Z"
          fill="currentColor"
        />
        <path
          d="M22.3665 10.6922C23.2112 9.84754 23.2112 8.47812 22.3665 7.63348C21.5219 6.78884 20.1525 6.78884 19.3078 7.63348L19.1806 7.76071C19.0578 7.88348 19.0022 8.05496 19.0329 8.22586C19.0522 8.33336 19.0879 8.49053 19.153 8.67807C19.2831 9.05314 19.5288 9.54549 19.9917 10.0083C20.4545 10.4712 20.9469 10.7169 21.3219 10.847C21.5095 10.9121 21.6666 10.9478 21.7741 10.9671C21.945 10.9978 22.1165 10.9422 22.2393 10.8194L22.3665 10.6922Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.17157 3.17157C3 4.34315 3 6.22876 3 10V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C20.9812 19.6756 20.9997 17.8316 21 14.1801L18.1817 16.9984C17.9119 17.2683 17.691 17.4894 17.4415 17.6841C17.1491 17.9121 16.8328 18.1076 16.4981 18.2671C16.2124 18.4032 15.9159 18.502 15.5538 18.6225L13.2421 19.3931C12.4935 19.6426 11.6682 19.4478 11.1102 18.8898C10.5523 18.3318 10.3574 17.5065 10.607 16.7579L10.8805 15.9375L11.3556 14.5121L11.3775 14.4463C11.4981 14.0842 11.5968 13.7876 11.7329 13.5019C11.8924 13.1672 12.0879 12.8509 12.316 12.5586C12.5106 12.309 12.7317 12.0881 13.0017 11.8183L17.0081 7.81188L18.12 6.70004L18.2472 6.57282C18.9626 5.85741 19.9003 5.49981 20.838 5.5C20.6867 4.46945 20.3941 3.73727 19.8284 3.17157C18.6569 2 16.7712 2 13 2H11C7.22876 2 5.34315 2 4.17157 3.17157ZM7.25 9C7.25 8.58579 7.58579 8.25 8 8.25H14.5C14.9142 8.25 15.25 8.58579 15.25 9C15.25 9.41421 14.9142 9.75 14.5 9.75H8C7.58579 9.75 7.25 9.41421 7.25 9ZM7.25 13C7.25 12.5858 7.58579 12.25 8 12.25H10.5C10.9142 12.25 11.25 12.5858 11.25 13C11.25 13.4142 10.9142 13.75 10.5 13.75H8C7.58579 13.75 7.25 13.4142 7.25 13ZM7.25 17C7.25 16.5858 7.58579 16.25 8 16.25H9.5C9.91421 16.25 10.25 16.5858 10.25 17C10.25 17.4142 9.91421 17.75 9.5 17.75H8C7.58579 17.75 7.25 17.4142 7.25 17Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const MenuDots = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          d="M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z"
          fill="currentColor"
        />
        <path
          d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"
          fill="currentColor"
        />
        <path
          d="M21 12C21 13.1046 20.1046 14 19 14C17.8954 14 17 13.1046 17 12C17 10.8954 17.8954 10 19 10C20.1046 10 21 10.8954 21 12Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const MailIcon = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip0_1117_22771)">
        <path
          d="M12.0026 4.06641C12.8693 4.15166 13.4528 4.34434 13.8882 4.77979C14.6693 5.56084 14.6693 6.81792 14.6693 9.33208C14.6693 11.8462 14.6693 13.1033 13.8882 13.8844C13.1072 14.6654 11.8501 14.6654 9.33594 14.6654H6.66927C4.15511 14.6654 2.89803 14.6654 2.11699 13.8844C1.33594 13.1033 1.33594 11.8462 1.33594 9.33208C1.33594 6.81792 1.33594 5.56084 2.11699 4.77979C2.55244 4.34434 3.13586 4.15166 4.00261 4.06641"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path d="M6.66406 4H9.33073" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.33594 6H8.66927" stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M8 9.39528C7.2759 9.39528 6.66369 8.8851 5.43926 7.86475C4.73152 7.27496 4.37764 6.98007 4.18882 6.57693C4 6.17378 4 5.71314 4 4.79186V4.66536C4 3.09402 4 2.30834 4.48816 1.82019C4.97631 1.33203 5.76198 1.33203 7.33333 1.33203H8.66667C10.238 1.33203 11.0237 1.33203 11.5118 1.82019C12 2.30834 12 3.09402 12 4.66536V4.79187C12 5.71314 12 6.17378 11.8112 6.57693C11.6224 6.98007 11.2685 7.27496 10.5607 7.86475L10.5607 7.86475C9.33631 8.88511 8.7241 9.39528 8 9.39528Z"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M4 6.66797L5.43926 7.86736C6.66369 8.88771 7.2759 9.39789 8 9.39789C8.7241 9.39789 9.33631 8.88771 10.5607 7.86735L12 6.66797"
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1117_22771">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const XIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M17 7L7 17M7 7L17 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const InfoIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 22.5C9.21523 22.5 6.54451 21.3938 4.57538 19.4246C2.60625 17.4555 1.5 14.7848 1.5 12C1.5 9.21523 2.60625 6.54451 4.57538 4.57538C6.54451 2.60625 9.21523 1.5 12 1.5C14.7848 1.5 17.4555 2.60625 19.4246 4.57538C21.3938 6.54451 22.5 9.21523 22.5 12C22.5 14.7848 21.3938 17.4555 19.4246 19.4246C17.4555 21.3938 14.7848 22.5 12 22.5ZM12 24C15.1826 24 18.2348 22.7357 20.4853 20.4853C22.7357 18.2348 24 15.1826 24 12C24 8.8174 22.7357 5.76516 20.4853 3.51472C18.2348 1.26428 15.1826 0 12 0C8.8174 0 5.76516 1.26428 3.51472 3.51472C1.26428 5.76516 0 8.8174 0 12C0 15.1826 1.26428 18.2348 3.51472 20.4853C5.76516 22.7357 8.8174 24 12 24Z"
        fill="currentColor"
      />
      <path
        d="M13.3949 9.882L9.95993 10.3125L9.83693 10.8825L10.5119 11.007C10.9529 11.112 11.0399 11.271 10.9439 11.7105L9.83693 16.9125C9.54593 18.258 9.99443 18.891 11.0489 18.891C11.8664 18.891 12.8159 18.513 13.2464 17.994L13.3784 17.37C13.0784 17.634 12.6404 17.739 12.3494 17.739C11.9369 17.739 11.7869 17.4495 11.8934 16.9395L13.3949 9.882ZM13.4999 6.75C13.4999 7.14782 13.3419 7.52936 13.0606 7.81066C12.7793 8.09196 12.3978 8.25 11.9999 8.25C11.6021 8.25 11.2206 8.09196 10.9393 7.81066C10.658 7.52936 10.4999 7.14782 10.4999 6.75C10.4999 6.35218 10.658 5.97064 10.9393 5.68934C11.2206 5.40804 11.6021 5.25 11.9999 5.25C12.3978 5.25 12.7793 5.40804 13.0606 5.68934C13.3419 5.97064 13.4999 6.35218 13.4999 6.75Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const CloseIcon = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="15.5 15.5 13 13">
      <path
        d="M28 16L16 28M16 16L28 28"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></path>
    </svg>
  );
};
export const ShowMessagePreviewIcon = () => {
  return (
    <svg width="16" height="16" fill="none">
      <g clipPath="url(#a)" stroke="currentColor">
        <path d="M7 15a5 5 0 1 0-5-3v1l1 1h1l3 1Z" strokeWidth="1.5" />
        <path d="M12 10h1l1-1V7a4 4 0 0 0-4-6L6 4" strokeWidth="1.5" />
        <path d="M4 9h0m3 0h0m2 0h0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const UnreadMentionIcon = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_1202_17733)">
        <path
          d="M8 12C5.79086 12 4 10.2091 4 8C4 5.79086 5.79086 4 8 4C10.2091 4 12 5.79086 12 8C12 8.481 11.9151 8.94218 11.7595 9.36936C11.7034 9.52332 11.605 9.65737 11.4845 9.76848L11.4309 9.81801C11.0607 10.1595 10.5049 10.2033 10.0858 9.9239C9.78232 9.72154 9.6 9.38088 9.6 9.01609V8M9.6 8C9.6 8.88366 8.88366 9.6 8 9.6C7.11634 9.6 6.4 8.88366 6.4 8C6.4 7.11634 7.11634 6.4 8 6.4C8.88366 6.4 9.6 7.11634 9.6 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.33594 7.9987C1.33594 4.3168 4.32071 1.33203 8.0026 1.33203C11.6845 1.33203 14.6693 4.3168 14.6693 7.9987C14.6693 11.6806 11.6845 14.6654 8.0026 14.6654C4.32071 14.6654 1.33594 11.6806 1.33594 7.9987Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_1202_17733">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const DraftIcon = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_1202_7801)">
        <path
          d="M1.33594 7.9987C1.33594 4.856 1.33594 3.28465 2.31225 2.30834C3.28856 1.33203 4.85991 1.33203 8.0026 1.33203C11.1453 1.33203 12.7166 1.33203 13.693 2.30834C14.6693 3.28465 14.6693 4.856 14.6693 7.9987C14.6693 11.1414 14.6693 12.7127 13.693 13.6891C12.7166 14.6654 11.1453 14.6654 8.0026 14.6654C4.85991 14.6654 3.28856 14.6654 2.31225 13.6891C1.33594 12.7127 1.33594 11.1414 1.33594 7.9987Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M1.33594 8.66797H3.44278C4.04623 8.66797 4.34795 8.66797 4.61317 8.78995C4.87838 8.91193 5.07474 9.14102 5.46746 9.59919L5.87108 10.0701C6.2638 10.5283 6.46016 10.7573 6.72538 10.8793C6.99059 11.0013 7.29232 11.0013 7.89576 11.0013H8.10944C8.71289 11.0013 9.01462 11.0013 9.27983 10.8793C9.54505 10.7573 9.74141 10.5283 10.1341 10.0701L10.5377 9.59919C10.9305 9.14102 11.1268 8.91193 11.392 8.78995C11.6573 8.66797 11.959 8.66797 12.5624 8.66797H14.6693"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M5.33594 4.66797H10.6693"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M6.66406 7H9.33073"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1202_7801">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const FailedIcon = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_1202_7810)">
        <path
          d="M1.33594 4.63186C1.33594 4.04351 1.33594 3.74933 1.38217 3.50429C1.5857 2.42557 2.42948 1.58179 3.50819 1.37826C3.75324 1.33203 4.04742 1.33203 4.63577 1.33203C4.89355 1.33203 5.02245 1.33203 5.14632 1.34361C5.68037 1.39356 6.18695 1.60339 6.5999 1.94571C6.69568 2.02511 6.78682 2.11625 6.9691 2.29853L7.33594 2.66537C7.87979 3.20922 8.15172 3.48114 8.47735 3.66231C8.65623 3.76184 8.84598 3.84043 9.04284 3.89655C9.4012 3.9987 9.78576 3.9987 10.5549 3.9987H10.804C12.5589 3.9987 13.4364 3.9987 14.0067 4.51167C14.0592 4.55886 14.1091 4.60879 14.1563 4.66125C14.6693 5.2316 14.6693 6.10906 14.6693 7.86397V9.33203C14.6693 11.8462 14.6693 13.1033 13.8882 13.8843C13.1072 14.6654 11.8501 14.6654 9.33594 14.6654H6.66927C4.15511 14.6654 2.89803 14.6654 2.11699 13.8843C1.33594 13.1033 1.33594 11.8462 1.33594 9.33203V4.63186Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M7 10L9 8M9 10L7 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1202_7810">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const MutedIcon = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" fill="none" className={className}>
      <g clipPath="url(#a)">
        <path
          d="M11 8a1 1 0 0 0-1 0h1ZM5 5Zm1-1H5h1ZM5 4v1-1Zm-3 7v1-1ZM1 9H0h1Zm0 1h1-1Zm8 3Zm1-3h1-1Zm0 3v1-1ZM6 4v1-1Zm3-1Zm1 0V2v1ZM2 5V4v1ZM1 7H0h1Zm0-1h1-1Zm6 6a1 1 0 0 0-1 1l1-1ZM6 5 5 3v1l1 1ZM2 9V8H0v1h2Zm0-1V7H0v1h2Zm8 0v2h1V8h-1ZM4 5h1V4H4v1Zm1-1v1h1L5 4Zm0 1V4v1Zm-1 7h1v-1H4v1Zm0-1-1-1-1 2h2v-1ZM0 9l1 2 1-1V9H0Zm3 1H2l-1 1 1 1 1-2Zm7 0-1 2v1l1 1 1-2v-2h-1Zm-1 4h1l-1-1v1ZM6 5l2-2h1V2H8L5 3l1 2Zm3-2 1-1H9v1ZM4 4H2l1 2 1-1V4ZM2 7V6L1 5 0 7h2Zm0-3L1 5l1 1h1L2 4Zm4 9 2 1h1v-1H8l-1-1-1 1Zm5-7V4l-1-2-1 1v1l1 2h1Z"
          fill="currentColor"
        />
        <path
          d="m13 12 1-4V5M12 10V7M15 1 1 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const Soundwave = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.0026 2.70703C10.3478 2.70703 10.6276 2.98685 10.6276 3.33203L10.6276 16.6654C10.6276 17.0105 10.3478 17.2904 10.0026 17.2904C9.65743 17.2904 9.3776 17.0105 9.3776 16.6654L9.3776 3.33203C9.3776 2.98685 9.65743 2.70703 10.0026 2.70703ZM6.66927 5.20703C7.01445 5.20703 7.29427 5.48685 7.29427 5.83203V14.1654C7.29427 14.5105 7.01445 14.7904 6.66927 14.7904C6.32409 14.7904 6.04427 14.5105 6.04427 14.1654V5.83203C6.04427 5.48685 6.32409 5.20703 6.66927 5.20703ZM13.3359 5.20703C13.6811 5.20703 13.9609 5.48685 13.9609 5.83203V14.1654C13.9609 14.5105 13.6811 14.7904 13.3359 14.7904C12.9908 14.7904 12.7109 14.5105 12.7109 14.1654V5.83203C12.7109 5.48685 12.9908 5.20703 13.3359 5.20703ZM3.33594 8.54036C3.68112 8.54036 3.96094 8.82019 3.96094 9.16536L3.96094 10.832C3.96094 11.1772 3.68112 11.457 3.33594 11.457C2.99076 11.457 2.71094 11.1772 2.71094 10.832L2.71094 9.16536C2.71094 8.82019 2.99076 8.54036 3.33594 8.54036ZM16.6693 8.54036C17.0144 8.54036 17.2943 8.82019 17.2943 9.16536V10.832C17.2943 11.1772 17.0144 11.457 16.6693 11.457C16.3241 11.457 16.0443 11.1772 16.0443 10.832V9.16536C16.0443 8.82019 16.3241 8.54036 16.6693 8.54036Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Play = ({ className }: IconProps) => {
  return (
    <svg width="37" height="37" viewBox="0 0 37 37" fill="none" className={className}>
      <path
        d="M18.4229 0.160156C8.25346 0.160156 0 8.41362 0 18.5831C0 28.7525 8.25346 37.006 18.4229 37.006C28.5923 37.006 36.8458 28.7525 36.8458 18.5831C36.8458 8.41362 28.5923 0.160156 18.4229 0.160156ZM13.8172 23.502V13.6641C13.8172 12.2087 15.4384 11.3244 16.6543 12.1166L24.2998 17.0355C24.5584 17.2025 24.771 17.4317 24.9182 17.702C25.0654 17.9723 25.1425 18.2752 25.1425 18.5831C25.1425 18.8909 25.0654 19.1938 24.9182 19.4641C24.771 19.7344 24.5584 19.9636 24.2998 20.1306L16.6543 25.0495C15.4384 25.8417 13.8172 24.9574 13.8172 23.502Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SoundwaveLg = ({ className }: IconProps) => {
  return (
    <svg width="351" height="44" fill="none" className={className}>
      <path fill="currentColor" d="M349.6 22.8a1 1 0 1 0 0-2v2ZM2 22.8h347.6v-2H2v2Z" />
      <rect width="4.6" height="17.4" x="14.7" y="13.1" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="11.4" x="7.8" y="16.1" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="5.5" x=".8" y="19" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="12.3" x="55.3" y="15.7" fill="currentColor" rx="2.3" />
      <rect width="5.4" height="16.1" x="20.8" y="13.5" fill="currentColor" rx="2.7" />
      <rect width="5.4" height="16.1" x="61.4" y="13.5" fill="currentColor" rx="2.7" />
      <rect width="5.4" height="22" x="27.7" y="10.6" fill="currentColor" rx="2.7" />
      <rect width="4.6" height="8" x="68.4" y="17.8" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="31.7" x="34.6" y="5.9" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="43.2" x="75.3" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="21.6" x="41.5" y="11" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="30.9" x="82.2" y="6.3" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="10.2" x="48.4" y="16.5" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="26.2" x="89.1" y="8.5" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="17.4" x="108.6" y="13.1" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="11.4" x="101.7" y="16.1" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="5.5" x="94.8" y="19" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="12.3" x="149.3" y="15.7" fill="currentColor" rx="2.3" />
      <rect width="5.4" height="16.1" x="114.8" y="13.5" fill="currentColor" rx="2.7" />
      <rect width="5.4" height="16.1" x="155.4" y="13.5" fill="currentColor" rx="2.7" />
      <rect width="5.4" height="22" x="121.7" y="10.6" fill="currentColor" rx="2.7" />
      <rect width="4.6" height="8" x="162.3" y="17.8" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="31.7" x="128.6" y="5.9" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="43.2" x="169.2" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="21.6" x="135.5" y="11" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="30.9" x="176.1" y="6.3" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="10.2" x="142.4" y="16.5" fill="currentColor" rx="2.3" />
      <rect width="4.6" height="26.2" x="183" y="8.5" fill="currentColor" rx="2.3" />
      <rect
        width="4.6"
        height="17.4"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 268.2 13.1)"
      />
      <rect
        width="4.6"
        height="11.4"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 275 16)"
      />
      <rect
        width="4.6"
        height="5.5"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 282 19)"
      />
      <rect
        width="4.6"
        height="12.3"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 227.5 15.7)"
      />
      <rect
        width="5.4"
        height="16.1"
        fill="currentColor"
        rx="2.7"
        transform="matrix(-1 0 0 1 262 13.5)"
      />
      <rect
        width="5.4"
        height="16.1"
        fill="currentColor"
        rx="2.7"
        transform="matrix(-1 0 0 1 221.4 13.5)"
      />
      <rect
        width="5.4"
        height="22"
        fill="currentColor"
        rx="2.7"
        transform="matrix(-1 0 0 1 255.1 10.6)"
      />
      <rect
        width="4.6"
        height="8"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 214.5 17.8)"
      />
      <rect
        width="4.6"
        height="31.7"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 248.2 6)"
      />
      <rect
        width="4.6"
        height="43.2"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 207.6 0)"
      />
      <rect
        width="4.6"
        height="21.6"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 241.3 11)"
      />
      <rect
        width="4.6"
        height="30.9"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 200.7 6.3)"
      />
      <rect
        width="4.6"
        height="10.2"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 234.4 16.5)"
      />
      <rect
        width="4.6"
        height="26.2"
        fill="currentColor"
        rx="2.3"
        transform="matrix(-1 0 0 1 193.8 8.5)"
      />
    </svg>
  );
};
export const PersonSupport = ({ className }: IconProps) => {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" className={className}>
      <path
        d="M9.89987 16.6632L9.89838 16.6587L9.61337 16.5657C8.25791 16.0866 7.0687 15.2281 6.18738 14.0922C5.4747 13.1745 4.98501 12.1037 4.75693 10.9644C4.52884 9.82505 4.5686 8.64829 4.87307 7.52694C5.17754 6.40558 5.7384 5.37031 6.51139 4.50278C7.28439 3.63525 8.24838 2.95918 9.32733 2.52791C10.4063 2.09665 11.5707 1.92197 12.7287 2.01767C13.8867 2.11336 15.0066 2.47681 16.0002 3.07934C16.9937 3.68188 17.8336 4.50702 18.4537 5.48967C19.0738 6.47233 19.4571 7.58562 19.5734 8.74174C19.6139 9.15424 19.2734 9.49025 18.8594 9.49025C18.4454 9.49025 18.1139 9.15275 18.0644 8.74174C17.9305 7.68099 17.5156 6.67528 16.8627 5.82867C16.2097 4.98205 15.3424 4.3253 14.3504 3.92635C13.3585 3.52741 12.2779 3.40077 11.2206 3.55954C10.1633 3.71831 9.16761 4.15672 8.33658 4.8294C7.50555 5.50209 6.86936 6.38462 6.49385 7.38567C6.11833 8.38672 6.01712 9.46993 6.2007 10.5232C6.38428 11.5765 6.84597 12.5616 7.538 13.3766C8.23004 14.1916 9.12727 14.8069 10.1369 15.1587C10.3915 14.6943 10.8019 14.3345 11.2957 14.1429C11.7896 13.9512 12.3352 13.94 12.8365 14.111C13.3378 14.2821 13.7627 14.6246 14.0364 15.0782C14.31 15.5317 14.4148 16.0673 14.3324 16.5906C14.25 17.1138 13.9856 17.5912 13.5857 17.9387C13.1859 18.2862 12.6763 18.4815 12.1467 18.4902C11.617 18.4988 11.1013 18.3204 10.6903 17.9862C10.2793 17.652 9.99941 17.1835 9.89987 16.6632ZM8.71038 17.8257C7.24129 17.226 5.95689 16.2484 4.98738 14.9922C4.74095 15.3618 4.60942 15.7961 4.60938 16.2402V16.9902C4.60938 19.9467 7.39937 22.9902 12.1094 22.9902C16.8194 22.9902 19.6094 19.9467 19.6094 16.9902V16.2402C19.6094 15.6435 19.3723 15.0712 18.9504 14.6493C18.5284 14.2273 17.9561 13.9902 17.3594 13.9902H15.1094C15.424 14.4104 15.6469 14.8919 15.7636 15.4037C15.8804 15.9154 15.8884 16.446 15.7872 16.961C15.686 17.4761 15.4778 17.9641 15.176 18.3936C14.8743 18.8231 14.4857 19.1845 14.0355 19.4544C13.5853 19.7242 13.0835 19.8966 12.5624 19.9602C12.0414 20.0239 11.5128 19.9774 11.0109 19.8239C10.5089 19.6704 10.0448 19.4132 9.64852 19.069C9.25224 18.7248 8.93263 18.3013 8.71038 17.8257ZM16.6094 9.49025C16.6094 8.11925 15.9959 6.89074 15.0284 6.06574C14.556 5.66562 14.0061 5.36726 13.4132 5.18934C12.8202 5.01142 12.1969 4.95776 11.5823 5.03172C10.9676 5.10567 10.3749 5.30566 9.84105 5.61916C9.30723 5.93266 8.84383 6.35294 8.47984 6.8537C8.11586 7.35447 7.85911 7.92495 7.72566 8.52947C7.59222 9.13399 7.58494 9.75954 7.70428 10.367C7.82363 10.9745 8.06703 11.5508 8.41926 12.0599C8.7715 12.569 9.22499 12.9999 9.75138 13.3257C10.4184 12.785 11.2507 12.4896 12.1094 12.4887C12.9677 12.4887 13.8 12.7831 14.4674 13.3227C15.122 12.92 15.6625 12.3563 16.0375 11.6855C16.4125 11.0146 16.6093 10.2588 16.6094 9.49025Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Soundbar = ({ className }: IconProps) => {
  return (
    <svg width="820" height="13" viewBox="0 0 820 13" fill="none" className={className}>
      <rect x="1.125" y="5.45312" width="818.73" height="2" fill="currentColor" />
      <circle cx="6.3042" cy="6.45264" r="5.97607" fill="currentColor" />
    </svg>
  );
};
export const Users = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="2 2 19 19">
      <circle cx="9" cy="6" r="4" fill="currentColor"></circle>
      <ellipse cx="9" cy="17" rx="7" ry="4" fill="currentColor"></ellipse>
      <path
        d="M20.9972 16.9997C20.9972 18.6566 18.9616 19.9997 16.4764 19.9997C17.2086 19.1994 17.712 18.1948 17.712 17.0011C17.712 15.8061 17.2074 14.8005 16.4738 13.9998C18.9591 13.9998 20.9972 15.3429 20.9972 16.9997Z"
        fill="currentColor"
      ></path>
      <path
        d="M17.9972 6C17.9972 7.65685 16.654 9 14.9972 9C14.6359 9 14.2895 8.93614 13.9688 8.81908C14.4418 7.98699 14.712 7.02449 14.712 5.99888C14.712 4.97404 14.4422 4.0122 13.9698 3.18053C14.2903 3.06372 14.6363 3 14.9972 3C16.654 3 17.9972 4.34315 17.9972 6Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const VideoCameraDOT = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="2 4 20 16">
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 12.5V11.5C2 8.21252 2 6.56878 2.90796 5.46243C3.07418 5.25989 3.25989 5.07418 3.46243 4.90796C4.56878 4 6.21252 4 9.5 4C12.7875 4 14.4312 4 15.5376 4.90796C15.7401 5.07418 15.9258 5.25989 16.092 5.46243C16.7936 6.3173 16.9531 7.49303 16.9893 9.50002L17.6584 9.17082C19.6042 8.19788 20.5772 7.7114 21.2886 8.15107C22 8.59075 22 9.67853 22 11.8541V12.1459C22 14.3215 22 15.4093 21.2886 15.8489C20.5772 16.2886 19.6042 15.8021 17.6584 14.8292L16.9893 14.5C16.9531 16.507 16.7936 17.6827 16.092 18.5376C15.9258 18.7401 15.7401 18.9258 15.5376 19.092C14.4312 20 12.7875 20 9.5 20C6.21252 20 4.56878 20 3.46243 19.092C3.25989 18.9258 3.07418 18.7401 2.90796 18.5376C2 17.4312 2 15.7875 2 12.5ZM13.5607 9.56066C14.1464 8.97487 14.1464 8.02513 13.5607 7.43934C12.9749 6.85355 12.0251 6.85355 11.4393 7.43934C10.8536 8.02513 10.8536 8.97487 11.4393 9.56066C12.0251 10.1464 12.9749 10.1464 13.5607 9.56066Z"
          fill="currentColor"
        ></path>
      </g>
    </svg>
  );
};
export const Billing = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M4 5C4 4.20435 4.31607 3.44129 4.87868 2.87868C5.44129 2.31607 6.20435 2 7 2H17C17.7956 2 18.5587 2.31607 19.1213 2.87868C19.6839 3.44129 20 4.20435 20 5V21C19.9999 21.1883 19.9466 21.3728 19.8462 21.5322C19.7459 21.6916 19.6025 21.8194 19.4327 21.9009C19.2629 21.9824 19.0736 22.0143 18.8864 21.9929C18.6993 21.9715 18.522 21.8977 18.375 21.78L16.5 20.28L14.625 21.78C14.4329 21.9339 14.1908 22.0115 13.945 21.9981C13.6993 21.9846 13.4671 21.881 13.293 21.707L12 20.414L10.707 21.707C10.533 21.8811 10.3009 21.9849 10.0551 21.9986C9.80938 22.0122 9.56721 21.9348 9.375 21.781L7.5 20.28L5.625 21.78C5.47797 21.8977 5.30069 21.9715 5.11356 21.9929C4.92643 22.0143 4.73707 21.9824 4.56727 21.9009C4.39747 21.8194 4.25414 21.6916 4.15378 21.5322C4.05342 21.3728 4.00012 21.1883 4 21V5ZM7 4C6.73478 4 6.48043 4.10536 6.29289 4.29289C6.10536 4.48043 6 4.73478 6 5V18.92L6.875 18.22C7.05236 18.078 7.27279 18.0006 7.5 18.0006C7.72721 18.0006 7.94764 18.078 8.125 18.22L9.925 19.66L11.293 18.293C11.4805 18.1055 11.7348 18.0002 12 18.0002C12.2652 18.0002 12.5195 18.1055 12.707 18.293L14.074 19.66L15.875 18.22C16.0524 18.078 16.2728 18.0006 16.5 18.0006C16.7272 18.0006 16.9476 18.078 17.125 18.22L18 18.92V5C18 4.73478 17.8946 4.48043 17.7071 4.29289C17.5196 4.10536 17.2652 4 17 4H7ZM8 9C8 8.73478 8.10536 8.48043 8.29289 8.29289C8.48043 8.10536 8.73478 8 9 8H15C15.2652 8 15.5196 8.10536 15.7071 8.29289C15.8946 8.48043 16 8.73478 16 9C16 9.26522 15.8946 9.51957 15.7071 9.70711C15.5196 9.89464 15.2652 10 15 10H9C8.73478 10 8.48043 9.89464 8.29289 9.70711C8.10536 9.51957 8 9.26522 8 9ZM9 12C8.73478 12 8.48043 12.1054 8.29289 12.2929C8.10536 12.4804 8 12.7348 8 13C8 13.2652 8.10536 13.5196 8.29289 13.7071C8.48043 13.8946 8.73478 14 9 14H12C12.2652 14 12.5196 13.8946 12.7071 13.7071C12.8946 13.5196 13 13.2652 13 13C13 12.7348 12.8946 12.4804 12.7071 12.2929C12.5196 12.1054 12.2652 12 12 12H9Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Reports = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="3 2 18 20">
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.24502 2H16.755C17.9139 2 18.4933 2 18.9606 2.16261C19.8468 2.47096 20.5425 3.18719 20.842 4.09946C21 4.58055 21 5.17705 21 6.37006V20.3742C21 21.2324 20.015 21.6878 19.3919 21.1176C19.0258 20.7826 18.4742 20.7826 18.1081 21.1176L17.625 21.5597C16.9834 22.1468 16.0166 22.1468 15.375 21.5597C14.7334 20.9726 13.7666 20.9726 13.125 21.5597C12.4834 22.1468 11.5166 22.1468 10.875 21.5597C10.2334 20.9726 9.26659 20.9726 8.625 21.5597C7.98341 22.1468 7.01659 22.1468 6.375 21.5597L5.8919 21.1176C5.52583 20.7826 4.97417 20.7826 4.6081 21.1176C3.985 21.6878 3 21.2324 3 20.3742V6.37006C3 5.17705 3 4.58055 3.15795 4.09946C3.45748 3.18719 4.15322 2.47096 5.03939 2.16261C5.50671 2 6.08614 2 7.24502 2ZM15.0595 8.49952C15.3353 8.19054 15.3085 7.71643 14.9995 7.44055C14.6905 7.16468 14.2164 7.19152 13.9405 7.5005L10.9286 10.8739L10.0595 9.9005C9.78358 9.59152 9.30947 9.56468 9.00049 9.84055C8.69151 10.1164 8.66467 10.5905 8.94055 10.8995L10.3691 12.4995C10.5114 12.6589 10.7149 12.75 10.9286 12.75C11.1422 12.75 11.3457 12.6589 11.488 12.4995L15.0595 8.49952ZM7.5 14.75C7.08579 14.75 6.75 15.0858 6.75 15.5C6.75 15.9142 7.08579 16.25 7.5 16.25H16.5C16.9142 16.25 17.25 15.9142 17.25 15.5C17.25 15.0858 16.9142 14.75 16.5 14.75H7.5Z"
          fill="currentColor"
        ></path>
      </g>
    </svg>
  );
};
export const ReportsLineIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clip-path="url(#clip0_212_2949)">
        <path
          d="M4.00033 8.66406H1.33366C1.15685 8.66406 0.987279 8.7343 0.862254 8.85933C0.73723 8.98435 0.666992 9.15392 0.666992 9.33073V14.6641C0.666992 14.8409 0.73723 15.0104 0.862254 15.1355C0.987279 15.2605 1.15685 15.3307 1.33366 15.3307H4.00033C4.17714 15.3307 4.34671 15.2605 4.47173 15.1355C4.59675 15.0104 4.66699 14.8409 4.66699 14.6641V9.33073C4.66699 9.15392 4.59675 8.98435 4.47173 8.85933C4.34671 8.7343 4.17714 8.66406 4.00033 8.66406ZM3.33366 13.9974H2.00033V9.9974H3.33366V13.9974ZM14.667 5.9974H12.0003C11.8235 5.9974 11.6539 6.06763 11.5289 6.19266C11.4039 6.31768 11.3337 6.48725 11.3337 6.66406V14.6641C11.3337 14.8409 11.4039 15.0104 11.5289 15.1355C11.6539 15.2605 11.8235 15.3307 12.0003 15.3307H14.667C14.8438 15.3307 15.0134 15.2605 15.1384 15.1355C15.2634 15.0104 15.3337 14.8409 15.3337 14.6641V6.66406C15.3337 6.48725 15.2634 6.31768 15.1384 6.19266C15.0134 6.06763 14.8438 5.9974 14.667 5.9974ZM14.0003 13.9974H12.667V7.33073H14.0003V13.9974ZM9.33366 0.664062H6.66699C6.49018 0.664063 6.32061 0.7343 6.19559 0.859325C6.07056 0.984349 6.00033 1.15392 6.00033 1.33073V14.6641C6.00033 14.8409 6.07056 15.0104 6.19559 15.1355C6.32061 15.2605 6.49018 15.3307 6.66699 15.3307H9.33366C9.51047 15.3307 9.68004 15.2605 9.80506 15.1355C9.93009 15.0104 10.0003 14.8409 10.0003 14.6641V1.33073C10.0003 1.15392 9.93009 0.984349 9.80506 0.859325C9.68004 0.7343 9.51047 0.664063 9.33366 0.664062ZM8.66699 13.9974H7.33366V1.9974H8.66699V13.9974Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_212_2949">
          <rect width="16" height="16" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const More = ({ className }: IconProps) => {
  return (
    <svg fill="none" className={className} viewBox="2 4 20 16">
      <g>
        <path
          d="M4.97883 9.68508C2.99294 8.89073 2 8.49355 2 8C2 7.50645 2.99294 7.10927 4.97883 6.31492L7.7873 5.19153C9.77318 4.39718 10.7661 4 12 4C13.2339 4 14.2268 4.39718 16.2127 5.19153L19.0212 6.31492C21.0071 7.10927 22 7.50645 22 8C22 8.49355 21.0071 8.89073 19.0212 9.68508L16.2127 10.8085C14.2268 11.6028 13.2339 12 12 12C10.7661 12 9.77318 11.6028 7.7873 10.8085L4.97883 9.68508Z"
          fill="currentColor"
        ></path>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2 8C2 8.49355 2.99294 8.89073 4.97883 9.68508L7.7873 10.8085C9.77318 11.6028 10.7661 12 12 12C13.2339 12 14.2268 11.6028 16.2127 10.8085L19.0212 9.68508C21.0071 8.89073 22 8.49355 22 8C22 7.50645 21.0071 7.10927 19.0212 6.31492L16.2127 5.19153C14.2268 4.39718 13.2339 4 12 4C10.7661 4 9.77318 4.39718 7.7873 5.19153L4.97883 6.31492C2.99294 7.10927 2 7.50645 2 8Z"
          fill="currentColor"
        ></path>
        <path
          d="M19.0212 13.6851L16.2127 14.8085C14.2268 15.6028 13.2339 16 12 16C10.7661 16 9.77318 15.6028 7.7873 14.8085L4.97883 13.6851C2.99294 12.8907 2 12.4935 2 12C2 11.5551 2.80681 11.1885 4.42043 10.5388L7.56143 11.7952C9.41007 12.535 10.572 13 12 13C13.428 13 14.5899 12.535 16.4386 11.7952L19.5796 10.5388C21.1932 11.1885 22 11.5551 22 12C22 12.4935 21.0071 12.8907 19.0212 13.6851Z"
          fill="currentColor"
        ></path>
        <path
          d="M19.0212 17.6849L16.2127 18.8083C14.2268 19.6026 13.2339 19.9998 12 19.9998C10.7661 19.9998 9.77318 19.6026 7.7873 18.8083L4.97883 17.6849C2.99294 16.8905 2 16.4934 2 15.9998C2 15.5549 2.80681 15.1883 4.42043 14.5386L7.56143 15.795C9.41007 16.5348 10.572 16.9998 12 16.9998C13.428 16.9998 14.5899 16.5348 16.4386 15.795L19.5796 14.5386C21.1932 15.1883 22 15.5549 22 15.9998C22 16.4934 21.0071 16.8905 19.0212 17.6849Z"
          fill="currentColor"
        ></path>
      </g>
    </svg>
  );
};
export const Pen = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M6.81338 12.8507C7.0255 12.6853 7.21791 12.4929 7.60267 12.1081L12.5332 7.17753C11.8622 6.89823 11.0674 6.43945 10.3157 5.68777C9.56391 4.93597 9.1051 4.14104 8.82582 3.46992L3.89515 8.40058L3.89512 8.40061C3.51038 8.78536 3.31798 8.97775 3.15254 9.18987C2.95736 9.4401 2.79003 9.71086 2.6535 9.99733C2.53776 10.2402 2.45172 10.4983 2.27964 11.0145L1.37224 13.7368C1.28756 13.9908 1.35367 14.2709 1.54302 14.4602C1.73238 14.6496 2.01246 14.7157 2.2665 14.631L4.98872 13.7236C5.50495 13.5515 5.76307 13.4655 6.00592 13.3498C6.2924 13.2132 6.56315 13.0459 6.81338 12.8507Z"
          fill="currentColor"
        />
        <path
          d="M13.9014 5.80935C14.9252 4.78555 14.9252 3.12564 13.9014 2.10184C12.8776 1.07803 11.2177 1.07803 10.1939 2.10184L9.60254 2.6932C9.61064 2.71765 9.61904 2.74244 9.62775 2.76755C9.8445 3.39231 10.2535 4.21132 11.0228 4.98066C11.7922 5.75001 12.6112 6.15897 13.2359 6.37573C13.2609 6.3844 13.2856 6.39276 13.3099 6.40083L13.9014 5.80935Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const SquareTopup = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M12.2906 5.83398L14.4275 3.69712C14.6693 4.67311 14.6693 6.02702 14.6693 8.00065C14.6693 11.1433 14.6693 12.7147 13.693 13.691C12.7166 14.6673 11.1453 14.6673 8.0026 14.6673C4.85991 14.6673 3.28856 14.6673 2.31225 13.691C1.33594 12.7147 1.33594 11.1433 1.33594 8.00065C1.33594 4.85795 1.33594 3.28661 2.31225 2.3103C3.28856 1.33398 4.85991 1.33398 8.0026 1.33398C9.97624 1.33398 11.3301 1.33398 12.3061 1.5758L10.1693 3.71266V3.33398C10.1693 2.50556 9.4977 1.83398 8.66927 1.83398C7.84084 1.83398 7.16927 2.50556 7.16927 3.33398V7.33398C7.16927 8.16241 7.84084 8.83398 8.66927 8.83398H12.6693C13.4977 8.83398 14.1693 8.16241 14.1693 7.33398C14.1693 6.50556 13.4977 5.83398 12.6693 5.83398H12.2906Z"
          fill="currentColor"
        />
        <path
          d="M12.6693 7.83398C12.9454 7.83398 13.1693 7.61013 13.1693 7.33398C13.1693 7.05784 12.9454 6.83398 12.6693 6.83398H9.87638L14.3562 2.3542C14.5514 2.15894 14.5514 1.84236 14.3562 1.6471C14.1609 1.45184 13.8443 1.45184 13.649 1.6471L9.16927 6.12688V3.33398C9.16927 3.05784 8.94541 2.83398 8.66927 2.83398C8.39313 2.83398 8.16927 3.05784 8.16927 3.33398V7.33398C8.16927 7.61013 8.39313 7.83398 8.66927 7.83398H12.6693Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const TrashBin = ({ className }: IconProps) => {
  return (
    // <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
    //   <g>
    //     <path
    //       d="M2 4.34986C2 4.08686 2.21781 3.87367 2.48648 3.87367H5.67858C5.68292 3.31285 5.7437 2.54401 6.30025 2.01177C6.73824 1.59291 7.33872 1.33398 7.99999 1.33398C8.66127 1.33398 9.26174 1.59291 9.69974 2.01177C10.2563 2.54401 10.3171 3.31285 10.3214 3.87367H13.5135C13.7822 3.87367 14 4.08686 14 4.34986C14 4.61285 13.7822 4.82605 13.5135 4.82605H2.48648C2.21781 4.82605 2 4.61285 2 4.34986Z"
    //       fill="currentColor"
    //     />
    //     <path
    //       d="M7.7377 14.6673H8.26233C10.0673 14.6673 10.9698 14.6673 11.5566 14.0918C12.1434 13.5164 12.2034 12.5724 12.3235 10.6845L12.4965 7.96412C12.5617 6.93975 12.5942 6.42756 12.2999 6.10299C12.0055 5.77843 11.5084 5.77843 10.5141 5.77843H5.48589C4.49166 5.77843 3.99455 5.77843 3.70018 6.10299C3.4058 6.42756 3.43838 6.93975 3.50352 7.96412L3.67653 10.6845C3.79659 12.5724 3.85663 13.5164 4.44342 14.0918C5.03021 14.6673 5.93271 14.6673 7.7377 14.6673Z"
    //       fill="currentColor"
    //     />
    //   </g>
    // </svg>
    <svg
      width="18"
      height="17"
      viewBox="0 0 18 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.3312 4.75033H15.6624V6.08366H14.3299V14.7503C14.3299 14.937 14.2655 15.0948 14.1367 15.2237C14.0079 15.3525 13.8502 15.417 13.6637 15.417H4.33615C4.1496 15.417 3.99192 15.3525 3.86311 15.2237C3.73431 15.0948 3.6699 14.937 3.6699 14.7503V6.08366H2.3374V4.75033H5.66865V2.75033C5.66865 2.56366 5.73306 2.40588 5.86186 2.27699C5.99067 2.1481 6.14835 2.08366 6.3349 2.08366H11.6649C11.8515 2.08366 12.0091 2.1481 12.1379 2.27699C12.2667 2.40588 12.3312 2.56366 12.3312 2.75033V4.75033ZM12.9974 6.08366H5.0024V14.0837H12.9974V6.08366ZM7.00115 8.08366H8.33365V12.0837H7.00115V8.08366ZM9.66615 8.08366H10.9987V12.0837H9.66615V8.08366ZM7.00115 3.41699V4.75033H10.9987V3.41699H7.00115Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PhoneCalling = ({ className }: IconProps) => {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className={className}>
      <g>
        <path
          d="M31.1423 23.2713L29.2041 22.1896C27.455 21.2135 25.1604 21.6053 23.6229 23.1428C23.6229 23.1428 23.6229 23.1428 23.6229 23.1428C23.6229 23.1429 21.758 25.0076 18.3768 21.6265C14.9961 18.2458 16.8599 16.3809 16.8605 16.3803C16.8605 16.3803 16.8605 16.3803 16.8605 16.3803C18.3979 14.8428 18.7898 12.5483 17.8136 10.7992L16.7319 8.86093C15.2579 6.21971 11.5539 5.90779 9.23228 8.22937C7.83728 9.62437 6.75181 11.3333 6.68019 13.2225C6.55963 16.4027 7.36448 21.8035 12.7821 27.2211C18.1997 32.6388 23.6006 33.4436 26.7808 33.3231C28.6699 33.2514 30.3789 32.166 31.7739 30.771C34.0955 28.4494 33.7835 24.7454 31.1423 23.2713Z"
          fill="currentColor"
        />
        <path
          d="M36.8643 17.9002C37.5458 17.7899 38.0081 17.1456 37.8978 16.4642C37.8897 16.422 37.8643 16.2863 37.8485 16.2151C37.8168 16.0729 37.7681 15.8745 37.696 15.6272C37.552 15.1326 37.3146 14.4416 36.9344 13.6122C36.1731 11.9517 34.8415 9.74205 32.5485 7.44905C30.2555 5.15605 28.0458 3.82437 26.3853 3.06312C25.5559 2.68289 24.8649 2.44555 24.3703 2.30148C24.123 2.22943 23.9246 2.18067 23.7824 2.149C23.7113 2.13316 23.6542 2.12159 23.612 2.11352L23.56 2.10393C22.8785 1.9936 22.2076 2.45168 22.0973 3.13317C21.9873 3.8127 22.4473 4.45287 23.1256 4.56591C23.1438 4.56939 23.1928 4.57894 23.2389 4.58922C23.3312 4.60978 23.4776 4.64535 23.6712 4.70174C24.0584 4.81452 24.634 5.01041 25.3434 5.33567C26.7606 5.98539 28.7176 7.15372 30.7807 9.21682C32.8438 11.2799 34.0121 13.2369 34.6618 14.6541C34.9871 15.3635 35.183 15.9391 35.2958 16.3263C35.3522 16.5199 35.408 16.7632 35.4286 16.8555C35.5416 17.5338 36.1848 18.0102 36.8643 17.9002Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M31.1152 17.5231C31.779 17.3335 32.1634 16.6416 31.9737 15.9778L30.7718 16.3212C31.9737 15.9778 31.9737 15.9778 31.9737 15.9778L31.973 15.9754L31.9723 15.9729L31.9707 15.9673L31.9668 15.9544L31.9566 15.9214C31.9485 15.8963 31.9381 15.8649 31.9248 15.8275C31.8982 15.7526 31.8604 15.6537 31.8084 15.5323C31.7044 15.2895 31.5437 14.9578 31.3025 14.5502C30.8197 13.7345 30.0177 12.6208 28.7094 11.3125C27.4012 10.0043 26.2875 9.20229 25.4717 8.71949C25.0642 8.4783 24.7324 8.3176 24.4896 8.21354C24.3683 8.16154 24.2694 8.12376 24.1945 8.0972C24.1571 8.08393 24.1257 8.07346 24.1006 8.06542L24.0676 8.05515L24.0547 8.05129L24.0491 8.04967L24.0466 8.04893C24.0466 8.04893 24.0442 8.04824 23.7008 9.25015L24.0442 8.04824C23.3804 7.85859 22.6885 8.24295 22.4989 8.90675C22.3108 9.5649 22.6871 10.2507 23.3405 10.4471L23.3585 10.4533C23.3835 10.4622 23.4328 10.4805 23.5048 10.5114C23.6487 10.5731 23.8841 10.6849 24.1984 10.8709C24.8263 11.2425 25.7751 11.9137 26.9417 13.0803C28.1083 14.2469 28.7794 15.1956 29.1511 15.8236C29.3371 16.1379 29.4489 16.3733 29.5106 16.5171C29.5414 16.5892 29.5598 16.6385 29.5687 16.6635L29.5749 16.6815C29.7713 17.3349 30.4571 17.7112 31.1152 17.5231Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const CallDropped = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M12.5 3.33203V4.16536C12.5 5.73671 12.5 6.52239 12.9882 7.01054C13.4763 7.4987 14.262 7.4987 15.8333 7.4987H17.0833M17.0833 7.4987L15 5.83203M17.0833 7.4987L15 9.16536"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.36726 4.42884L8.90811 5.39795C9.39619 6.27252 9.20026 7.4198 8.43153 8.18853C8.43153 8.18853 8.43153 8.18853 8.43153 8.18853C8.43141 8.18865 7.49919 9.12109 9.1897 10.8116C10.8796 12.5015 11.812 11.5706 11.8128 11.5698C11.8128 11.5698 11.8128 11.5698 11.8128 11.5697C12.5815 10.801 13.7288 10.6051 14.6034 11.0932L15.5725 11.634C16.8931 12.3711 17.049 14.2231 15.8882 15.3839C15.1907 16.0814 14.3363 16.6241 13.3917 16.6599C11.8016 16.7202 9.10117 16.3178 6.39236 13.6089C3.68354 10.9001 3.28112 8.19972 3.3414 6.6096C3.37721 5.66503 3.91994 4.81056 4.61744 4.11306C5.77823 2.95227 7.63025 3.10823 8.36726 4.42884Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Remove = ({ className }: IconProps) => {
  return (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" className={className}>
      <rect
        x="27"
        width="27"
        height="27"
        rx="13.5"
        transform="rotate(90 27 0)"
        fill="currentColor"
      />
      <path
        d="M18.2914 19.5L19.5 18.2914L14.7086 13.5L19.5 8.70857L18.2914 7.5L13.5 12.2914L8.70857 7.5L7.5 8.70857L12.2914 13.5L7.5 18.2914L8.70857 19.5L13.5 14.7086L18.2914 19.5Z"
        fill="white"
      />
    </svg>
  );
};
export const Copy = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g>
        <path
          d="M15.24 2H11.3458C9.58159 1.99999 8.18418 1.99997 7.09054 2.1476C5.96501 2.29953 5.05402 2.61964 4.33559 3.34096C3.61717 4.06227 3.29833 4.97692 3.14701 6.10697C2.99997 7.205 2.99999 8.60802 3 10.3793V16.2169C3 17.725 3.91995 19.0174 5.22717 19.5592C5.15989 18.6498 5.15994 17.3737 5.16 16.312L5.16 11.3976L5.16 11.3024C5.15993 10.0207 5.15986 8.91644 5.27828 8.03211C5.40519 7.08438 5.69139 6.17592 6.4253 5.43906C7.15921 4.70219 8.06404 4.41485 9.00798 4.28743C9.88877 4.16854 10.9887 4.1686 12.2652 4.16867L12.36 4.16868H15.24L15.3348 4.16867C16.6113 4.1686 17.7088 4.16854 18.5896 4.28743C18.0627 2.94779 16.7616 2 15.24 2Z"
          fill="currentColor"
        />
        <path
          d="M6.60156 11.3964C6.60156 8.67022 6.60156 7.30712 7.4451 6.4602C8.28863 5.61328 9.64627 5.61328 12.3616 5.61328H15.2416C17.9569 5.61328 19.3145 5.61328 20.158 6.4602C21.0016 7.30712 21.0016 8.67022 21.0016 11.3964V16.2157C21.0016 18.9419 21.0016 20.305 20.158 21.1519C19.3145 21.9988 17.9569 21.9988 15.2416 21.9988H12.3616C9.64627 21.9988 8.28863 21.9988 7.4451 21.1519C6.60156 20.305 6.60156 18.9419 6.60156 16.2157V11.3964Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Eye = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M8.1263 10.0007C8.1263 8.96512 8.96577 8.12565 10.0013 8.12565C11.0368 8.12565 11.8763 8.96512 11.8763 10.0007C11.8763 11.0362 11.0368 11.8757 10.0013 11.8757C8.96577 11.8757 8.1263 11.0362 8.1263 10.0007Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.66797 10.0007C1.66797 11.3668 2.02211 11.8269 2.73038 12.747C4.14461 14.5844 6.5164 16.6673 10.0013 16.6673C13.4862 16.6673 15.858 14.5844 17.2722 12.747C17.9805 11.8269 18.3346 11.3668 18.3346 10.0007C18.3346 8.6345 17.9805 8.17442 17.2722 7.25426C15.858 5.41695 13.4862 3.33398 10.0013 3.33398C6.5164 3.33398 4.14461 5.41695 2.73038 7.25426C2.02211 8.17442 1.66797 8.6345 1.66797 10.0007ZM10.0013 6.87565C8.27541 6.87565 6.8763 8.27476 6.8763 10.0007C6.8763 11.7265 8.27541 13.1257 10.0013 13.1257C11.7272 13.1257 13.1263 11.7265 13.1263 10.0007C13.1263 8.27476 11.7272 6.87565 10.0013 6.87565Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Notice = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path
        d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Templates = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.616 19C4.15533 19 3.771 18.846 3.463 18.538C3.155 18.23 3.00067 17.8453 3 17.384V6.616C3 6.15533 3.15433 5.771 3.463 5.463C3.77167 5.155 4.15567 5.00067 4.615 5H19.385C19.845 5 20.229 5.15433 20.537 5.463C20.845 5.77167 20.9993 6.156 21 6.616V17.385C21 17.845 20.8457 18.2293 20.537 18.538C20.2283 18.8467 19.8443 19.0007 19.385 19H4.616ZM4.616 18H15V14.116H4V17.385C4 17.5383 4.064 17.6793 4.192 17.808C4.32 17.9367 4.461 18.0007 4.615 18M16 18H19.385C19.5383 18 19.6793 17.936 19.808 17.808C19.9367 17.68 20.0007 17.5387 20 17.384V9.231H16V18ZM4 13.116H15V9.23H4V13.116Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Mobile = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path
        d="M18 22c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2H8c-1.103 0-2 .897-2 2v16c0 1.103.897 2 2 2h10zm-5-5a1 1 0 1 1 0 2 1 1 0 1 1 0-2z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const CallOutgoing = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M15 4V5C15 6.88562 15 7.82843 15.5858 8.41421C16.1716 9 17.1144 9 19 9H20.5M20.5 9L18 7M20.5 9L18 11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M10.0376 5.31617L10.6866 6.4791C11.2723 7.52858 11.0372 8.90533 10.1147 9.8278C10.1147 9.8278 8.99578 10.9467 11.0245 12.9755C13.0532 15.0042 14.1722 13.8853 14.1722 13.8853C15.0947 12.9628 16.4714 12.7277 17.5209 13.3134L18.6838 13.9624C20.2686 14.8468 20.4557 17.0692 19.0628 18.4622C18.2258 19.2992 17.2004 19.9505 16.0669 19.9934C14.1588 20.0658 10.9183 19.5829 7.6677 16.3323C4.41713 13.0817 3.93421 9.84122 4.00655 7.93309C4.04952 6.7996 4.7008 5.77423 5.53781 4.93723C6.93076 3.54428 9.15317 3.73144 10.0376 5.31617Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </g>
    </svg>
    // <svg
    //   width="24"
    //   height="24"
    //   viewBox="0 0 24 24"
    //   fill="none"
    //   xmlns="http://www.w3.org/2000/svg"
    //   className={className}
    // >
    //   <g opacity="0.9">
    //     <path
    //       d="M15 9L19 5M19 5V8M19 5H16"
    //       stroke="currentColor"
    //       stroke-width="1.5"
    //       stroke-linecap="round"
    //       stroke-linejoin="round"
    //     />
    //     <path
    //       d="M15.1007 15.0272L14.5569 14.5107L15.1007 15.0272ZM15.5562 14.5477L16.1 15.0642H16.1L15.5562 14.5477ZM17.9728 14.2123L17.5987 14.8623H17.5987L17.9728 14.2123ZM19.8833 15.312L19.5092 15.962L19.8833 15.312ZM20.4217 18.7584L20.9655 19.2749L20.4217 18.7584ZM19.0011 20.254L18.4573 19.7375L19.0011 20.254ZM17.6763 20.9631L17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587L7.81536 16.4752ZM3.00289 6.96594L2.25397 7.00613L2.25397 7.00613L3.00289 6.96594ZM9.47752 8.50311L10.0213 9.01963H10.0213L9.47752 8.50311ZM9.63424 5.6931L10.2466 5.26012L9.63424 5.6931ZM8.37326 3.90961L7.76086 4.3426V4.3426L8.37326 3.90961ZM5.26145 3.60864L5.80524 4.12516L5.26145 3.60864ZM3.69185 5.26114L3.14806 4.74462L3.14806 4.74462L3.69185 5.26114ZM11.0631 13.0559L11.6069 12.5394L11.0631 13.0559ZM15.1007 15.0272L15.6445 15.5437L16.1 15.0642L15.5562 14.5477L15.0124 14.0312L14.5569 14.5107L15.1007 15.0272ZM17.9728 14.2123L17.5987 14.8623L19.5092 15.962L19.8833 15.312L20.2575 14.662L18.347 13.5623L17.9728 14.2123ZM20.4217 18.7584L19.8779 18.2419L18.4573 19.7375L19.0011 20.254L19.5449 20.7705L20.9655 19.2749L20.4217 18.7584ZM17.6763 20.9631L17.6026 20.2167C16.1676 20.3584 12.4233 20.2375 8.35915 15.9587L7.81536 16.4752L7.27157 16.9917C11.7009 21.655 15.9261 21.8895 17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587C4.48303 11.8778 3.83285 8.43556 3.75181 6.92574L3.00289 6.96594L2.25397 7.00613C2.35322 8.85536 3.1384 12.6403 7.27157 16.9917L7.81536 16.4752ZM9.1907 8.80507L9.7345 9.32159L10.0213 9.01963L9.47752 8.50311L8.93372 7.9866L8.64691 8.28856L9.1907 8.80507ZM9.63424 5.6931L10.2466 5.26012L8.98565 3.47663L8.37326 3.90961L7.76086 4.3426L9.02185 6.12608L9.63424 5.6931ZM5.26145 3.60864L4.71766 3.09213L3.14806 4.74462L3.69185 5.26114L4.23564 5.77765L5.80524 4.12516L5.26145 3.60864ZM9.1907 8.80507C8.64691 8.28856 8.64622 8.28929 8.64552 8.29002C8.64528 8.29028 8.64458 8.29102 8.64411 8.29152C8.64316 8.29254 8.64219 8.29357 8.64121 8.29463C8.63924 8.29675 8.6372 8.29896 8.6351 8.30127C8.63091 8.30588 8.62646 8.31087 8.62178 8.31625C8.61243 8.32701 8.60215 8.33931 8.59116 8.3532C8.56918 8.38098 8.54431 8.41512 8.51822 8.45588C8.46591 8.53764 8.40917 8.64531 8.36112 8.78033C8.26342 9.0549 8.21018 9.4185 8.27671 9.87257C8.40742 10.7647 8.99198 11.9644 10.5193 13.5724L11.0631 13.0559L11.6069 12.5394C10.1793 11.0363 9.82761 10.1106 9.76086 9.65511C9.72866 9.43536 9.76138 9.31957 9.77432 9.28321C9.78159 9.26277 9.78635 9.25709 9.78169 9.26437C9.77944 9.26789 9.77494 9.27451 9.76738 9.28407C9.76359 9.28885 9.75904 9.29437 9.7536 9.30063C9.75088 9.30375 9.74793 9.30706 9.74476 9.31056C9.74317 9.31231 9.74152 9.3141 9.73981 9.31594C9.73896 9.31686 9.73809 9.31779 9.7372 9.31873C9.73676 9.3192 9.73608 9.31992 9.73586 9.32015C9.73518 9.32087 9.7345 9.32159 9.1907 8.80507ZM11.0631 13.0559L10.5193 13.5724C12.0422 15.1757 13.1923 15.806 14.0698 15.9485C14.5201 16.0216 14.8846 15.9632 15.1606 15.8544C15.2955 15.8012 15.4022 15.7387 15.4823 15.6819C15.5223 15.6535 15.5556 15.6266 15.5824 15.6031C15.5959 15.5913 15.6077 15.5803 15.618 15.5703C15.6232 15.5654 15.628 15.5606 15.6324 15.5562C15.6346 15.554 15.6367 15.5518 15.6387 15.5497C15.6397 15.5487 15.6407 15.5477 15.6417 15.5467C15.6422 15.5462 15.6429 15.5454 15.6431 15.5452C15.6438 15.5444 15.6445 15.5437 15.1007 15.0272C14.5569 14.5107 14.5576 14.51 14.5583 14.5093C14.5585 14.509 14.5592 14.5083 14.5596 14.5078C14.5605 14.5069 14.5614 14.506 14.5623 14.5051C14.5641 14.5033 14.5658 14.5015 14.5674 14.4998C14.5708 14.4965 14.574 14.4933 14.577 14.4904C14.583 14.4846 14.5885 14.4796 14.5933 14.4754C14.6028 14.467 14.6099 14.4616 14.6145 14.4584C14.6239 14.4517 14.6229 14.454 14.6102 14.459C14.5909 14.4666 14.5 14.4987 14.3103 14.4679C13.9077 14.4025 13.0391 14.0472 11.6069 12.5394L11.0631 13.0559ZM8.37326 3.90961L8.98565 3.47663C7.97206 2.04305 5.94384 1.80119 4.71766 3.09213L5.26145 3.60864L5.80524 4.12516C6.32808 3.57471 7.24851 3.61795 7.76086 4.3426L8.37326 3.90961ZM3.00289 6.96594L3.75181 6.92574C3.73038 6.52644 3.90425 6.12654 4.23564 5.77765L3.69185 5.26114L3.14806 4.74462C2.61221 5.30877 2.20493 6.09246 2.25397 7.00613L3.00289 6.96594ZM19.0011 20.254L18.4573 19.7375C18.1783 20.0313 17.8864 20.1887 17.6026 20.2167L17.6763 20.9631L17.7499 21.7095C18.497 21.6357 19.1016 21.2373 19.5449 20.7705L19.0011 20.254ZM9.47752 8.50311L10.0213 9.01963C10.9889 8.00095 11.0574 6.40678 10.2466 5.26012L9.63424 5.6931L9.02185 6.12608C9.44399 6.72315 9.37926 7.51753 8.93372 7.9866L9.47752 8.50311ZM19.8833 15.312L19.5092 15.962C20.33 16.4345 20.4907 17.5968 19.8779 18.2419L20.4217 18.7584L20.9655 19.2749C22.2704 17.901 21.8904 15.6019 20.2575 14.662L19.8833 15.312ZM15.5562 14.5477L16.1 15.0642C16.4854 14.6584 17.086 14.5672 17.5987 14.8623L17.9728 14.2123L18.347 13.5623C17.2485 12.93 15.8861 13.1113 15.0124 14.0312L15.5562 14.5477Z"
    //       fill="currentColor"
    //     />
    //   </g>
    // </svg>
  );
};
export const CallIncoming = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M15.834 4.16667L12.5007 7.5M12.5007 7.5V5M12.5007 7.5H15.0007"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.36531 4.43079L8.90615 5.3999C9.39424 6.27447 9.1983 7.42175 8.42958 8.19048C8.42958 8.19049 8.42958 8.19048 8.42957 8.19049C8.42946 8.1906 7.49723 9.12304 9.18775 10.8136C10.8776 12.5034 11.81 11.5725 11.8108 11.5717C11.8108 11.5717 11.8108 11.5717 11.8109 11.5717C12.5796 10.803 13.7268 10.6071 14.6014 11.0951L15.5705 11.636C16.8911 12.373 17.0471 14.225 15.8863 15.3858C15.1888 16.0833 14.3343 16.626 13.3897 16.6619C11.7996 16.7221 9.09922 16.3197 6.3904 13.6109C3.68159 10.9021 3.27916 8.20167 3.33944 6.61156C3.37525 5.66698 3.91799 4.81251 4.61549 4.11501C5.77628 2.95422 7.6283 3.11018 8.36531 4.43079Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const AssignNumberIcon = ({ className }: IconProps) => {
  return (
    <svg viewBox="-0.54 -0.54 101.14 101.32" className={className}>
      <path
        d="M0 0 C3 0.4375 3 0.4375 4.65551758 2.16699219 C6.17185898 4.72772854 6.41707907 6.25036708 6.51171875 9.203125 C6.54716797 10.09257813 6.58261719 10.98203125 6.61914062 11.8984375 C6.65297852 13.27902344 6.65297852 13.27902344 6.6875 14.6875 C6.72166016 15.62335937 6.75582031 16.55921875 6.79101562 17.5234375 C6.87332162 19.82800533 6.9425263 22.13220119 7 24.4375 C7.76143311 24.50219482 8.52286621 24.56688965 9.30737305 24.63354492 C12.76992176 24.94088734 16.228254 25.28255479 19.6875 25.625 C20.88568359 25.72619141 22.08386719 25.82738281 23.31835938 25.93164062 C24.47529297 26.05087891 25.63222656 26.17011719 26.82421875 26.29296875 C28.41882935 26.44221802 28.41882935 26.44221802 30.0456543 26.59448242 C33.95597133 27.71028481 35.55597984 29.20820904 38 32.4375 C38.61523438 35.57202148 38.61523438 35.57202148 38.59375 39.05859375 C38.59117188 40.32380859 38.58859375 41.58902344 38.5859375 42.89257812 C38.55757813 44.20677734 38.52921875 45.52097656 38.5 46.875 C38.50386719 48.84049805 38.50386719 48.84049805 38.5078125 50.84570312 C38.42664582 58.82032925 37.88074428 63.96337982 32.6484375 70.2734375 C27.7980361 74.00474567 21.43899956 73.15607295 15.625 73.0625 C14.43132812 73.08183594 13.23765625 73.10117188 12.0078125 73.12109375 C4.709585 73.08072745 -0.50881031 72.45160433 -6 67.4375 C-8.91539337 64.45498966 -11.47548392 61.22772599 -14.06640625 57.96484375 C-17.86142054 53.34928583 -21.75427557 50.29941641 -27 47.4375 C-26.76073573 43.84853589 -26.60993153 42.01046598 -23.9375 39.5 C-20.09828821 38.11134893 -16.85741027 38.33538278 -13 39.4375 C-10.99264515 40.42265304 -8.99188963 41.42144109 -7 42.4375 C-6.98541748 41.27178467 -6.97083496 40.10606934 -6.95581055 38.9050293 C-6.89786883 34.58293878 -6.82063606 30.26137153 -6.73754883 25.93969727 C-6.70427998 24.06868986 -6.67625415 22.19758162 -6.65356445 20.32641602 C-6.62005412 17.63774617 -6.56774135 14.95000202 -6.51171875 12.26171875 C-6.50532883 11.42412521 -6.4989389 10.58653168 -6.49235535 9.72355652 C-6.34414298 3.87880133 -6.34414298 3.87880133 -4.66047668 1.71980286 C-3 0.4375 -3 0.4375 0 0 Z "
        fill="currentColor"
        transform="translate(62,27.5625)"
      ></path>
      <path
        d="M0 0 C2.38312703 1.89428046 3.6500559 3.30011179 5 6 C5.5811138 13.08958838 5.5811138 13.08958838 3.125 16.9375 C0.13549686 19.83907658 -0.57629239 19.97949802 -4.875 20.1875 C-10.45147548 20.07657553 -10.45147548 20.07657553 -13 18 C-15.36230491 14.57873083 -16.25836526 11.9698519 -15.9375 7.875 C-14.96105281 3.83901829 -14.29151862 2.42023428 -11 0 C-7.16499319 -1.2783356 -3.85497292 -1.02592021 0 0 Z "
        fill="currentColor"
        transform="translate(42,27)"
      ></path>
      <path
        d="M0 0 C2.8100346 1.79363911 4.50940468 3.01880935 6 6 C6.42071592 9.05920574 6.48514117 11.9467746 6 15 C3.81840855 17.75569447 2.12822506 19.43588747 -1 21 C-6.26883876 21.59873168 -8.8846468 20.25400021 -13 17 C-14.72869779 13.54260443 -14.48966895 9.78024432 -14 6 C-10.38599231 0.2175877 -6.68966949 -0.96115941 0 0 Z "
        fill="currentColor"
        transform="translate(14,53)"
      ></path>
      <path
        d="M0 0 C5.57894737 3.15789474 5.57894737 3.15789474 7 6 C7.55512815 10.63213493 7.6364242 13.98172127 5.125 18 C1.85159987 21.08084718 -0.46126475 21.33387487 -4.9609375 21.29296875 C-8.13134567 20.83745033 -9.8192402 19.24684343 -12 17 C-13.73631636 13.52736727 -13.60190402 9.78806987 -13 6 C-9.08606917 1.05608737 -6.27104539 -0.60298513 0 0 Z "
        fill="currentColor"
        transform="translate(13,26)"
      ></path>
      <path
        d="M0 0 C2.75569447 2.18159145 4.43588747 3.87177494 6 7 C6.59873168 12.26883876 5.25400021 14.8846468 2 19 C-1.45739557 20.72869779 -5.21975568 20.48966895 -9 20 C-11.87029869 18.20606332 -13.49131638 17.01736724 -15 14 C-15.5811138 6.91041162 -15.5811138 6.91041162 -13.125 3.0625 C-9.24699241 -0.70144855 -5.21240222 -0.82822281 0 0 Z "
        fill="currentColor"
        transform="translate(68,0)"
      ></path>
      <path
        d="M0 0 C2.87029869 1.79393668 4.49131638 2.98263276 6 6 C6.5811138 13.08958838 6.5811138 13.08958838 4.125 16.9375 C0.63841797 20.3215355 -2.03592714 20.38966392 -6.73828125 20.359375 C-10.32520929 19.78943134 -11.86838894 17.79773951 -14 15 C-15.43304064 12.13391871 -15.30644155 10.18699217 -15 7 C-11.06142639 0.04185329 -7.71503326 -0.99935664 0 0 Z "
        fill="currentColor"
        transform="translate(41,0)"
      ></path>
      <path
        d="M0 0 C3.125 1.875 3.125 1.875 5 5 C5.98876625 10.02622846 5.7769173 13.70513784 3.125 18.125 C-1.29486216 20.7769173 -4.97377154 20.98876625 -10 20 C-13.125 18.125 -13.125 18.125 -15 15 C-15.98876625 9.97377154 -15.7769173 6.29486216 -13.125 1.875 C-8.70513784 -0.7769173 -5.02622846 -0.98876625 0 0 Z "
        fill="currentColor"
        transform="translate(15,0)"
      ></path>
      <path
        d="M0 0 C3.44312714 2.1244827 4.71617547 3.14852641 6 7 C4.948125 7.268125 3.89625 7.53625 2.8125 7.8125 C-3.71215022 9.8447681 -6.46626185 12.11043642 -10 18 C-11.94140625 17.26953125 -11.94140625 17.26953125 -14 16 C-15.46967786 11.91220747 -15.42694989 8.05613921 -13.8125 4.0625 C-9.99529566 -0.28121528 -5.66516166 -0.93295321 0 0 Z "
        fill="currentColor"
        transform="translate(41,53)"
      ></path>
    </svg>
  );
};
export const Grid = ({ className }: IconProps) => {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24">
      <path
        d="M4 4h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 10h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 16h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const Grid2 = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3.5 11V3.5H11V11H3.5ZM3.5 20.5V13H11V20.5H3.5ZM13 11V3.5H20.5V11H13ZM13 20.5V13H20.5V20.5H13Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CalendarIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="34"
      height="32"
      viewBox="0 0 34 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.0633 2.66732V5.33399H21.0621V2.66732H23.7283V5.33399H29.0608C29.4341 5.33399 29.7496 5.46287 30.0073 5.72065C30.2651 5.97843 30.3939 6.29399 30.3939 6.66732V28.0007C30.3939 28.374 30.2651 28.6895 30.0073 28.9473C29.7496 29.2051 29.4341 29.334 29.0608 29.334H5.06457C4.6913 29.334 4.37579 29.2051 4.11805 28.9473C3.86031 28.6895 3.73145 28.374 3.73145 28.0007V6.66732C3.73145 6.29399 3.86031 5.97843 4.11805 5.72065C4.37579 5.46287 4.6913 5.33399 5.06457 5.33399H10.3971V2.66732H13.0633ZM27.7277 16.0007H6.3977V26.6673H27.7277V16.0007ZM10.3971 8.00065H6.3977V13.334H27.7277V8.00065H23.7283V10.6673H21.0621V8.00065H13.0633V10.6673H10.3971V8.00065Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const DownloadIcon = (props: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={props.className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.99935 1.04102C9.65417 1.04102 9.37435 1.32084 9.37435 1.66602V10.8098L7.97388 9.17594C7.74925 8.91386 7.35468 8.88351 7.0926 9.10815C6.83053 9.33279 6.80017 9.72735 7.02481 9.98943L9.52481 12.9061C9.64355 13.0446 9.8169 13.1243 9.99935 13.1243C10.1818 13.1243 10.3551 13.0446 10.4739 12.9061L12.9739 9.98943C13.1985 9.72735 13.1682 9.33279 12.9061 9.10815C12.644 8.88351 12.2495 8.91386 12.0248 9.17594L10.6243 10.8098L10.6243 1.66602C10.6243 1.32084 10.3445 1.04102 9.99935 1.04102Z"
        fill="currentColor"
      />
      <path
        d="M11.8743 7.49935V7.81458C12.4856 7.59913 13.192 7.70693 13.7195 8.15908C14.5058 8.83299 14.5968 10.0167 13.9229 10.8029L11.4229 13.7196C11.0667 14.1352 10.5467 14.3743 9.99931 14.3743C9.45196 14.3743 8.93193 14.1352 8.57571 13.7196L6.07571 10.8029C5.40179 10.0167 5.49285 8.83299 6.27908 8.15908C6.80658 7.70693 7.51299 7.59913 8.12432 7.81458V7.49935H6.66602C4.30899 7.49935 3.13048 7.49935 2.39825 8.23158C1.66602 8.96381 1.66602 10.1423 1.66602 12.4993V13.3327C1.66602 15.6897 1.66602 16.8682 2.39825 17.6005C3.13048 18.3327 4.30899 18.3327 6.66601 18.3327H13.3327C15.6897 18.3327 16.8682 18.3327 17.6005 17.6005C18.3327 16.8682 18.3327 15.6897 18.3327 13.3327V12.4993C18.3327 10.1423 18.3327 8.96381 17.6005 8.23158C16.8682 7.49935 15.6897 7.49935 13.3327 7.49935H11.8743Z"
        fill="currentColor"
      />
    </svg>
  );
};
// export const DownloadIcon = ({ className }: IconProps) => {
//   return (
//     <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
//       <path
//         fillRule="evenodd"
//         clipRule="evenodd"
//         d="M9.99935 1.04102C9.65417 1.04102 9.37435 1.32084 9.37435 1.66602V10.8098L7.97388 9.17594C7.74925 8.91386 7.35468 8.88351 7.0926 9.10815C6.83053 9.33279 6.80017 9.72735 7.02481 9.98943L9.52481 12.9061C9.64355 13.0446 9.8169 13.1243 9.99935 13.1243C10.1818 13.1243 10.3551 13.0446 10.4739 12.9061L12.9739 9.98943C13.1985 9.72735 13.1682 9.33279 12.9061 9.10815C12.644 8.88351 12.2495 8.91386 12.0248 9.17594L10.6243 10.8098L10.6243 1.66602C10.6243 1.32084 10.3445 1.04102 9.99935 1.04102Z"
//         fill="currentColor"
//       />
//       <path
//         d="M11.8743 7.49935V7.81458C12.4856 7.59913 13.192 7.70693 13.7195 8.15908C14.5058 8.83299 14.5968 10.0167 13.9229 10.8029L11.4229 13.7196C11.0667 14.1352 10.5467 14.3743 9.99931 14.3743C9.45196 14.3743 8.93193 14.1352 8.57571 13.7196L6.07571 10.8029C5.40179 10.0167 5.49285 8.83299 6.27908 8.15908C6.80658 7.70693 7.51299 7.59913 8.12432 7.81458V7.49935H6.66602C4.30899 7.49935 3.13048 7.49935 2.39825 8.23158C1.66602 8.96381 1.66602 10.1423 1.66602 12.4993V13.3327C1.66602 15.6897 1.66602 16.8682 2.39825 17.6005C3.13048 18.3327 4.30899 18.3327 6.66601 18.3327H13.3327C15.6897 18.3327 16.8682 18.3327 17.6005 17.6005C18.3327 16.8682 18.3327 15.6897 18.3327 13.3327V12.4993C18.3327 10.1423 18.3327 8.96381 17.6005 8.23158C16.8682 7.49935 15.6897 7.49935 13.3327 7.49935H11.8743Z"
//         fill="currentColor"
//       />
//     </svg>
//   );
// };
export const DeliverySettings = ({ className }: IconProps) => {
  return (
    <svg width="21" height="20" viewBox="0 0 21 20" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.8555 1.66602C9.92726 1.66602 9.08197 2.1666 7.39137 3.16778L6.81957 3.5064C5.12897 4.50757 4.28367 5.00816 3.81957 5.83268C3.35547 6.65721 3.35547 7.65838 3.35547 9.66073V10.338C3.35547 12.3403 3.35547 13.3415 3.81957 14.166C4.28367 14.9905 5.12897 15.4911 6.81957 16.4923L7.39137 16.8309C9.08197 17.8321 9.92726 18.3327 10.8555 18.3327C11.7837 18.3327 12.629 17.8321 14.3196 16.8309L14.8914 16.4923C16.582 15.4911 17.4273 14.9905 17.8914 14.166C18.3555 13.3415 18.3555 12.3403 18.3555 10.338V9.66073C18.3555 7.65838 18.3555 6.65721 17.8914 5.83268C17.4273 5.00816 16.582 4.50757 14.8914 3.5064L14.3196 3.16778C12.629 2.1666 11.7837 1.66602 10.8555 1.66602ZM7.73047 9.99935C7.73047 8.27346 9.12958 6.87435 10.8555 6.87435C12.5814 6.87435 13.9805 8.27346 13.9805 9.99935C13.9805 11.7252 12.5814 13.1243 10.8555 13.1243C9.12958 13.1243 7.73047 11.7252 7.73047 9.99935Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const BusinessAnalyticsIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6.54765 17.5882H8.31206V12H6.54765V17.5882ZM15.6879 17.5882H17.4524V6.11765H15.6879V17.5882ZM11.1176 17.5882H12.8824V14.3529H11.1176V17.5882ZM11.1176 12H12.8824V9.64706H11.1176V12ZM4.12676 22C3.53245 22 3.02941 21.7941 2.61765 21.3824C2.20588 20.9706 2 20.4675 2 19.8732V4.12676C2 3.53245 2.20588 3.02941 2.61765 2.61765C3.02941 2.20588 3.53245 2 4.12676 2H19.8732C20.4675 2 20.9706 2.20588 21.3824 2.61765C21.7941 3.02941 22 3.53245 22 4.12676V19.8732C22 20.4675 21.7941 20.9706 21.3824 21.3824C20.9706 21.7941 20.4675 22 19.8732 22H4.12676Z"
        fill="white"
      />
    </svg>
  );
};
export const User = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 11.3333C10.7167 11.3333 9.61811 10.8764 8.70433 9.96267C7.79033 9.04867 7.33333 7.95 7.33333 6.66667C7.33333 5.38333 7.79033 4.28478 8.70433 3.371C9.61811 2.457 10.7167 2 12 2C13.2833 2 14.3819 2.457 15.2957 3.371C16.2097 4.28478 16.6667 5.38333 16.6667 6.66667C16.6667 7.95 16.2097 9.04867 15.2957 9.96267C14.3819 10.8764 13.2833 11.3333 12 11.3333ZM2 21.4873V18.523C2 17.8701 2.17733 17.2654 2.532 16.709C2.88667 16.1526 3.36067 15.7248 3.954 15.4257C5.27178 14.7797 6.60122 14.2951 7.94233 13.972C9.28344 13.6489 10.636 13.4873 12 13.4873C13.364 13.4873 14.7166 13.6489 16.0577 13.972C17.3988 14.2951 18.7282 14.7797 20.046 15.4257C20.6393 15.7248 21.1133 16.1526 21.468 16.709C21.8227 17.2654 22 17.8701 22 18.523V21.4873H2Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AdoptionUsage = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15.1232 10.8547C14.9491 10.3814 14.6905 9.96911 14.3474 9.61773C14.0044 9.26654 13.5962 9.00814 13.1229 8.84251V1C15.7538 1.25638 17.9937 2.30471 19.8425 4.14501C21.6915 5.98512 22.744 8.22169 23 10.8547H15.1232ZM10.9351 22.942C8.10414 22.6591 5.74055 21.4725 3.84433 19.3822C1.94811 17.2917 1 14.8208 1 11.9695C1 9.11843 1.94811 6.64434 3.84433 4.54728C5.74055 2.45041 8.10414 1.26799 10.9351 1V8.83699C10.2683 9.07634 9.73324 9.4847 9.32981 10.0621C8.92638 10.6395 8.72467 11.2764 8.72467 11.973C8.72467 12.6698 8.92822 13.2965 9.33533 13.8532C9.74244 14.4096 10.2757 14.8076 10.9351 15.0469V22.942ZM13.1229 22.942V15.0452C13.6014 14.8793 14.011 14.6262 14.3515 14.2856C14.6919 13.9451 14.9491 13.5382 15.1232 13.0649H23C22.7425 15.695 21.6895 17.9344 19.8411 19.783C17.9924 21.6314 15.7531 22.6844 13.1229 22.942Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CompanyNumbersIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M5.375 21L6.5 16.5H2L2.5625 14.25H7.0625L8.1875 9.75H3.6875L4.25 7.5H8.75L9.875 3H12.125L11 7.5H15.5L16.625 3H18.875L17.75 7.5H22.25L21.6875 9.75H17.1875L16.0625 14.25H20.5625L20 16.5H15.5L14.375 21H12.125L13.25 16.5H8.75L7.625 21H5.375ZM9.3125 14.25H13.8125L14.9375 9.75H10.4375L9.3125 14.25Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Check = ({ className }: IconProps) => {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" className={className}>
      <path
        d="M6.5501 13L0.850098 7.29998L2.2751 5.87498L6.5501 10.15L15.7251 0.974976L17.1501 2.39998L6.5501 13Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UserCheck = ({ className }: IconProps) => {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={className}>
      <path
        d="M16.0325 10.5113L13.0407 7.51952L14.0422 6.54147L16.0325 8.53176L20.0131 4.55119L21 5.55265L16.0325 10.5113ZM8.02453 10.5562C7.12039 10.5562 6.34801 10.2359 5.70737 9.59527C5.06673 8.95479 4.74641 8.1824 4.74641 7.27811C4.74641 6.37398 5.06673 5.60159 5.70737 4.96095C6.34801 4.32032 7.12039 4 8.02453 4C8.92866 4 9.70105 4.32032 10.3417 4.96095C10.9823 5.60159 11.3026 6.37398 11.3026 7.27811C11.3026 8.1824 10.9823 8.95479 10.3417 9.59527C9.70105 10.2359 8.92866 10.5562 8.02453 10.5562ZM1 17.6889V15.6066C1 15.148 1.12457 14.7233 1.3737 14.3324C1.62284 13.9415 1.9558 13.641 2.37259 13.4309C3.29827 12.9771 4.23214 12.6367 5.17421 12.4098C6.11628 12.1828 7.06638 12.0693 8.02453 12.0693C8.98267 12.0693 9.93278 12.1828 10.8748 12.4098C11.8169 12.6367 12.7508 12.9771 13.6765 13.4309C14.0933 13.641 14.4262 13.9415 14.6753 14.3324C14.9245 14.7233 15.0491 15.148 15.0491 15.6066V17.6889H1Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const StatesDone = ({ className }: IconProps) => {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" className={className}>
      <path
        d="M10.5808 16.8397L17.3038 10.1167L16.25 9.06294L10.5808 14.7322L7.73075 11.8822L6.677 12.9359L10.5808 16.8397ZM12.0017 22.0859C10.6877 22.0859 9.45267 21.8366 8.2965 21.3379C7.14033 20.8393 6.13467 20.1625 5.2795 19.3077C4.42433 18.4529 3.74725 17.4476 3.24825 16.2919C2.74942 15.1363 2.5 13.9015 2.5 12.5877C2.5 11.2737 2.74933 10.0386 3.248 8.88244C3.74667 7.72627 4.42342 6.7206 5.27825 5.86544C6.13308 5.01027 7.13833 4.33319 8.294 3.83419C9.44967 3.33535 10.6844 3.08594 11.9983 3.08594C13.3123 3.08594 14.5473 3.33527 15.7035 3.83394C16.8597 4.3326 17.8653 5.00935 18.7205 5.86419C19.5757 6.71902 20.2528 7.72427 20.7518 8.87994C21.2506 10.0356 21.5 11.2704 21.5 12.5842C21.5 13.8982 21.2507 15.1333 20.752 16.2894C20.2533 17.4456 19.5766 18.4513 18.7218 19.3064C17.8669 20.1616 16.8617 20.8387 15.706 21.3377C14.5503 21.8365 13.3156 22.0859 12.0017 22.0859Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MenuLines = ({ className }: IconProps) => {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" className={className}>
      <path
        d="M3.57031 17.6342V16.1345H20.5703V17.6342H3.57031ZM3.57031 12.7497V11.2497H20.5703V12.7497H3.57031ZM3.57031 7.86498V6.36523H20.5703V7.86498H3.57031Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Cart = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.66699 14.6693C4.30033 14.6693 3.98655 14.5388 3.72566 14.2779C3.46477 14.017 3.33411 13.703 3.33366 13.3359C3.33322 12.9688 3.46388 12.655 3.72566 12.3946C3.98744 12.1342 4.30122 12.0035 4.66699 12.0026C5.03277 12.0017 5.34677 12.1324 5.60899 12.3946C5.87122 12.6568 6.00166 12.9706 6.00033 13.3359C5.99899 13.7013 5.86855 14.0153 5.60899 14.2779C5.34944 14.5406 5.03544 14.671 4.66699 14.6693ZM11.3337 14.6693C10.967 14.6693 10.6532 14.5388 10.3923 14.2779C10.1314 14.017 10.0008 13.703 10.0003 13.3359C9.99988 12.9688 10.1306 12.655 10.3923 12.3946C10.6541 12.1342 10.9679 12.0035 11.3337 12.0026C11.6994 12.0017 12.0134 12.1324 12.2757 12.3946C12.5379 12.6568 12.6683 12.9706 12.667 13.3359C12.6657 13.7013 12.5352 14.0153 12.2757 14.2779C12.0161 14.5406 11.7021 14.671 11.3337 14.6693ZM4.10033 4.0026L5.70033 7.33594H10.367L12.2003 4.0026H4.10033ZM3.46699 2.66927H13.3003C13.5559 2.66927 13.7503 2.78327 13.8837 3.01127C14.017 3.23927 14.0226 3.46972 13.9003 3.7026L11.5337 7.96927C11.4114 8.19149 11.2477 8.36372 11.0423 8.48594C10.837 8.60816 10.6119 8.66927 10.367 8.66927H5.40033L4.66699 10.0026H12.0003C12.1892 10.0026 12.3477 10.0666 12.4757 10.1946C12.6037 10.3226 12.6674 10.4808 12.667 10.6693C12.6666 10.8577 12.6026 11.0162 12.475 11.1446C12.3474 11.273 12.1892 11.3368 12.0003 11.3359H4.66699C4.16699 11.3359 3.78922 11.1166 3.53366 10.6779C3.27811 10.2393 3.26699 9.80305 3.50033 9.36927L4.40033 7.73594L2.00033 2.66927H1.33366C1.14477 2.66927 0.98655 2.60527 0.858994 2.47727C0.731439 2.34927 0.667439 2.19105 0.666994 2.0026C0.66655 1.81416 0.73055 1.65594 0.858994 1.52794C0.987439 1.39994 1.14566 1.33594 1.33366 1.33594H2.41699C2.53922 1.33594 2.65588 1.36927 2.76699 1.43594C2.87811 1.5026 2.96144 1.59705 3.01699 1.71927L3.46699 2.66927Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AdditionalPhoneNumbers = ({ className }: IconProps) => {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className={className}>
      <path
        d="M14.0169 15.7436C13.7449 15.7436 13.5131 15.6478 13.3217 15.4561C13.13 15.2646 13.0342 15.0329 13.0342 14.7608C13.0342 14.4886 13.13 14.2568 13.3217 14.0653C13.5131 13.8736 13.7449 13.7778 14.0169 13.7778C14.2892 13.7778 14.521 13.8736 14.7125 14.0653C14.9042 14.2568 15 14.4886 15 14.7608C15 15.0329 14.9042 15.2646 14.7125 15.4561C14.521 15.6478 14.2892 15.7436 14.0169 15.7436ZM14.0169 9.07695C13.7449 9.07695 13.5131 8.98111 13.3217 8.78944C13.13 8.59796 13.0342 8.3662 13.0342 8.09417C13.0342 7.82194 13.13 7.59009 13.3217 7.39861C13.5131 7.20694 13.7449 7.11111 14.0169 7.11111C14.2892 7.11111 14.521 7.20694 14.7125 7.39861C14.9042 7.59009 15 7.82194 15 8.09417C15 8.3662 14.9042 8.59796 14.7125 8.78944C14.521 8.98111 14.2892 9.07695 14.0169 9.07695ZM16.2392 12.4103C15.9671 12.4103 15.7354 12.3144 15.5439 12.1228C15.3522 11.9313 15.2564 11.6995 15.2564 11.4275C15.2564 11.1553 15.3522 10.9234 15.5439 10.7319C15.7354 10.5403 15.9671 10.4444 16.2392 10.4444C16.5114 10.4444 16.7432 10.5403 16.9347 10.7319C17.1264 10.9234 17.2222 11.1553 17.2222 11.4275C17.2222 11.6995 17.1264 11.9313 16.9347 12.1228C16.7432 12.3144 16.5114 12.4103 16.2392 12.4103ZM17.3503 15.7436C17.0782 15.7436 16.8465 15.6478 16.655 15.4561C16.4633 15.2646 16.3675 15.0329 16.3675 14.7608C16.3675 14.4886 16.4633 14.2568 16.655 14.0653C16.8465 13.8736 17.0782 13.7778 17.3503 13.7778C17.6225 13.7778 17.8544 13.8736 18.0458 14.0653C18.2375 14.2568 18.3333 14.4886 18.3333 14.7608C18.3333 15.0329 18.2375 15.2646 18.0458 15.4561C17.8544 15.6478 17.6225 15.7436 17.3503 15.7436ZM17.3503 9.07695C17.0782 9.07695 16.8465 8.98111 16.655 8.78944C16.4633 8.59796 16.3675 8.3662 16.3675 8.09417C16.3675 7.82194 16.4633 7.59009 16.655 7.39861C16.8465 7.20694 17.0782 7.11111 17.3503 7.11111C17.6225 7.11111 17.8544 7.20694 18.0458 7.39861C18.2375 7.59009 18.3333 7.82194 18.3333 8.09417C18.3333 8.3662 18.2375 8.59796 18.0458 8.78944C17.8544 8.98111 17.6225 9.07695 17.3503 9.07695ZM19.5725 12.4103C19.3005 12.4103 19.0687 12.3144 18.8772 12.1228C18.6856 11.9313 18.5897 11.6995 18.5897 11.4275C18.5897 11.1553 18.6856 10.9234 18.8772 10.7319C19.0687 10.5403 19.3005 10.4444 19.5725 10.4444C19.8447 10.4444 20.0766 10.5403 20.2681 10.7319C20.4597 10.9234 20.5556 11.1553 20.5556 11.4275C20.5556 11.6995 20.4597 11.9313 20.2681 12.1228C20.0766 12.3144 19.8447 12.4103 19.5725 12.4103ZM20.6836 15.7436C20.4116 15.7436 20.1798 15.6478 19.9883 15.4561C19.7967 15.2646 19.7008 15.0329 19.7008 14.7608C19.7008 14.4886 19.7967 14.2568 19.9883 14.0653C20.1798 13.8736 20.4116 13.7778 20.6836 13.7778C20.9558 13.7778 21.1877 13.8736 21.3792 14.0653C21.5708 14.2568 21.6667 14.4886 21.6667 14.7608C21.6667 15.0329 21.5708 15.2646 21.3792 15.4561C21.1877 15.6478 20.9558 15.7436 20.6836 15.7436ZM20.6836 9.07695C20.4116 9.07695 20.1798 8.98111 19.9883 8.78944C19.7967 8.59796 19.7008 8.3662 19.7008 8.09417C19.7008 7.82194 19.7967 7.59009 19.9883 7.39861C20.1798 7.20694 20.4116 7.11111 20.6836 7.11111C20.9558 7.11111 21.1877 7.20694 21.3792 7.39861C21.5708 7.59009 21.6667 7.82194 21.6667 8.09417C21.6667 8.3662 21.5708 8.59796 21.3792 8.78944C21.1877 8.98111 20.9558 9.07695 20.6836 9.07695ZM22.9058 12.4103C22.6338 12.4103 22.402 12.3144 22.2106 12.1228C22.0189 11.9313 21.9231 11.6995 21.9231 11.4275C21.9231 11.1553 22.0189 10.9234 22.2106 10.7319C22.402 10.5403 22.6338 10.4444 22.9058 10.4444C23.1781 10.4444 23.4099 10.5403 23.6014 10.7319C23.7931 10.9234 23.8889 11.1553 23.8889 11.4275C23.8889 11.6995 23.7931 11.9313 23.6014 12.1228C23.4099 12.3144 23.1781 12.4103 22.9058 12.4103ZM24.0169 15.7436C23.7449 15.7436 23.5131 15.6478 23.3217 15.4561C23.13 15.2646 23.0342 15.0329 23.0342 14.7608C23.0342 14.4886 23.13 14.2568 23.3217 14.0653C23.5131 13.8736 23.7449 13.7778 24.0169 13.7778C24.2892 13.7778 24.521 13.8736 24.7125 14.0653C24.9042 14.2568 25 14.4886 25 14.7608C25 15.0329 24.9042 15.2646 24.7125 15.4561C24.521 15.6478 24.2892 15.7436 24.0169 15.7436ZM24.0169 9.07695C23.7449 9.07695 23.5131 8.98111 23.3217 8.78944C23.13 8.59796 23.0342 8.3662 23.0342 8.09417C23.0342 7.82194 23.13 7.59009 23.3217 7.39861C23.5131 7.20694 23.7449 7.11111 24.0169 7.11111C24.2892 7.11111 24.521 7.20694 24.7125 7.39861C24.9042 7.59009 25 7.82194 25 8.09417C25 8.3662 24.9042 8.59796 24.7125 8.78944C24.521 8.98111 24.2892 9.07695 24.0169 9.07695ZM22.7114 24.8889C20.6175 24.8889 18.5139 24.402 16.4006 23.4283C14.2874 22.4546 12.3441 21.0811 10.5706 19.3078C8.80426 17.5343 7.43426 15.5926 6.46056 13.4828C5.48685 11.3731 5 9.27139 5 7.1775C5 6.84417 5.11111 6.56454 5.33333 6.33861C5.55556 6.11287 5.83333 6 6.16667 6H9.79056C10.0711 6 10.3186 6.09157 10.5331 6.27472C10.7475 6.45769 10.8839 6.6838 10.9422 6.95306L11.5792 10.2222C11.6232 10.5256 11.614 10.7862 11.5514 11.0042C11.4886 11.2221 11.376 11.4052 11.2136 11.5533L8.6475 14.0514C9.06046 14.8077 9.53231 15.5231 10.0631 16.1978C10.5936 16.8722 11.1681 17.5164 11.7864 18.1303C12.396 18.7401 13.0442 19.3064 13.7308 19.8292C14.4175 20.3519 15.159 20.8384 15.9553 21.2886L18.4486 18.7736C18.6225 18.5927 18.8331 18.4658 19.0803 18.3931C19.3273 18.3205 19.5841 18.3027 19.8506 18.3397L22.9358 18.9681C23.2164 19.0421 23.4454 19.1853 23.6228 19.3975C23.8002 19.6097 23.8889 19.8505 23.8889 20.1197V23.7222C23.8889 24.0556 23.776 24.3333 23.5503 24.5556C23.3244 24.7778 23.0447 24.8889 22.7114 24.8889Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Cloud = ({ className }: IconProps) => {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" className={className}>
      <path
        d="M4.83854 13.1094C3.82743 13.1094 2.96365 12.7812 2.24721 12.125C1.53076 11.4688 1.17232 10.6667 1.17188 9.71875C1.17188 8.90625 1.43299 8.18229 1.95521 7.54688C2.47743 6.91146 3.16076 6.50521 4.00521 6.32812C4.28299 5.36979 4.83854 4.59375 5.67188 4C6.50521 3.40625 7.44965 3.10938 8.50521 3.10938C9.80521 3.10938 10.9081 3.53396 11.8139 4.38313C12.7197 5.23229 13.1723 6.26604 13.1719 7.48438C13.9385 7.56771 14.5748 7.87771 15.0805 8.41437C15.5863 8.95104 15.839 9.57854 15.8385 10.2969C15.8385 11.0781 15.547 11.7423 14.9639 12.2894C14.3808 12.8365 13.6723 13.1098 12.8385 13.1094H4.83854Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const DollarSign = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g clipPath="url(#clip0_5287_100267)">
        <path
          d="M10 0.832031V19.1654"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14.1667 4.16797H7.91667C7.14312 4.16797 6.40125 4.47526 5.85427 5.02224C5.30729 5.56922 5 6.31109 5 7.08463C5 7.85818 5.30729 8.60005 5.85427 9.14703C6.40125 9.69401 7.14312 10.0013 7.91667 10.0013H12.0833C12.8569 10.0013 13.5987 10.3086 14.1457 10.8556C14.6927 11.4026 15 12.1444 15 12.918C15 13.6915 14.6927 14.4334 14.1457 14.9804C13.5987 15.5273 12.8569 15.8346 12.0833 15.8346H5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_5287_100267">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const DollarSignCircle = ({ className }: IconProps) => {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M13.0004 5.7998V20.1998M16.6004 9.9998C16.6004 8.3438 14.9888 6.9998 13.0004 6.9998C11.012 6.9998 9.40039 8.3438 9.40039 9.9998C9.40039 11.6558 11.012 12.9998 13.0004 12.9998C14.9888 12.9998 16.6004 14.3438 16.6004 15.9998C16.6004 17.6558 14.9888 18.9998 13.0004 18.9998C11.012 18.9998 9.40039 17.6558 9.40039 15.9998"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
};
export const FileFilled = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M11.75 14.1797C12.0815 14.1797 12.3995 14.048 12.6339 13.8136C12.8683 13.5792 13 13.2612 13 12.9297V5.42969L9.25 1.67969H4.25C3.91848 1.67969 3.60054 1.81138 3.36612 2.0458C3.1317 2.28022 3 2.59817 3 2.92969V12.9297C3 13.2612 3.1317 13.5792 3.36612 13.8136C3.60054 14.048 3.91848 14.1797 4.25 14.1797H11.75ZM8.625 2.92969L11.75 6.05469H8.625V2.92969ZM4.875 5.42969H6.75V6.67969H4.875V5.42969ZM4.875 7.92969H11.125V9.17969H4.875V7.92969ZM4.875 10.4297H11.125V11.6797H4.875V10.4297Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Light = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2.77344 12.7422V11.1672L11.0109 2.9222C11.0755 2.86511 11.1464 2.82095 11.2234 2.7897C11.3005 2.75845 11.3811 2.74261 11.4653 2.7422C11.5495 2.74178 11.6307 2.75511 11.7091 2.7822C11.7882 2.80845 11.8611 2.85595 11.9278 2.9247L12.5947 3.59595C12.6634 3.6622 12.7105 3.73511 12.7359 3.8147C12.7609 3.89386 12.7734 3.97303 12.7734 4.0522C12.7734 4.1372 12.7593 4.21845 12.7309 4.29595C12.7022 4.37303 12.6568 4.44366 12.5947 4.50782L4.34781 12.7422H2.77344ZM11.2134 4.98532L12.1484 4.06157L11.4541 3.3672L10.5309 4.3022L11.2134 4.98532Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Tachometer = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path
        d="M12 4C6.486 4 2 8.486 2 14a9.89 9.89 0 0 0 1.051 4.445c.17.34.516.555.895.555h16.107c.379 0 .726-.215.896-.555A9.89 9.89 0 0 0 22 14c0-5.514-4.486-10-10-10zm5.022 5.022L13.06 15.06a1.53 1.53 0 0 1-2.121.44 1.53 1.53 0 0 1 0-2.561l6.038-3.962a.033.033 0 0 1 .045.01.034.034 0 0 1 0 .035z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const CallLogIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12.6039 6.58413L11 4.98025V9H15.0198L13.4159 7.39612L16 4.81199L15.188 4L12.6039 6.58413Z"
        fill="currentColor"
      />
      <path
        d="M19.338 11.1275L20.9126 13.004L21.2909 8.67935L16.9663 8.301L18.5409 10.1775L15.5175 12.7144L16.3147 13.6644L19.338 11.1275Z"
        fill="currentColor"
      />
      <path
        d="M7.66024 8.15165L8.26869 9.16921C8.81778 10.0875 8.59736 11.2922 7.73254 12.0993C7.73254 12.0993 7.73254 12.0993 7.73254 12.0993C7.73242 12.0994 6.68365 13.0785 8.58548 14.8535C10.4866 16.628 11.5356 15.6504 11.5364 15.6496C11.5365 15.6496 11.5364 15.6496 11.5365 15.6496C12.4013 14.8425 13.692 14.6367 14.6758 15.1492L15.7661 15.7171C17.2518 16.491 17.4272 18.4356 16.1213 19.6544C15.3367 20.3868 14.3754 20.9567 13.3127 20.9943C11.5239 21.0576 8.48589 20.635 5.43847 17.7908C2.39106 14.9465 1.93833 12.1111 2.00614 10.4415C2.04643 9.44965 2.657 8.55246 3.44169 7.82008C4.74758 6.60125 6.8311 6.76501 7.66024 8.15165Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SMSLogIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12.6039 6.58413L11 4.98025V9H15.0198L13.4159 7.39612L16 4.81199L15.188 4L12.6039 6.58413Z"
        fill="currentColor"
      />
      <path
        d="M19.338 11.1275L20.9126 13.004L21.2909 8.67935L16.9663 8.301L18.5409 10.1775L15.5175 12.7144L16.3147 13.6644L19.338 11.1275Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.8201 10.8055C1 11.6109 1 12.9073 1 15.5C1 18.0927 1 19.3891 1.8201 20.1945C2.6402 21 3.96013 21 6.6 21H9.4C12.0399 21 13.3598 21 14.1799 20.1945C15 19.3891 15 18.0927 15 15.5C15 12.9073 15 11.6109 14.1799 10.8055C13.3598 10 12.0399 10 9.4 10H6.6C3.96013 10 2.6402 10 1.8201 10.8055ZM12.6033 12.4199C12.7889 12.6387 12.7588 12.9638 12.5361 13.1461L10.9986 14.4045C10.3781 14.9123 9.87522 15.3239 9.43138 15.6043C8.96903 15.8964 8.51875 16.0809 8 16.0809C7.48125 16.0809 7.03097 15.8964 6.56862 15.6043C6.12478 15.3239 5.6219 14.9123 5.00145 14.4045L3.4639 13.1461C3.24116 12.9638 3.21106 12.6387 3.39668 12.4199C3.5823 12.2011 3.91335 12.1716 4.1361 12.3539L5.64732 13.5908C6.3004 14.1253 6.75381 14.4952 7.13661 14.737C7.50716 14.971 7.75845 15.0496 8 15.0496C8.24155 15.0496 8.49284 14.971 8.86339 14.737C9.24619 14.4952 9.6996 14.1253 10.3527 13.5908L11.8639 12.3539C12.0866 12.1716 12.4177 12.2011 12.6033 12.4199Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AnalyticsIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g clipPath="url(#clip0_5686_100265)">
        <path
          d="M5 12C4.73478 12 4.48043 12.1054 4.29289 12.2929C4.10536 12.4804 4 12.7348 4 13V21C4 21.2652 4.10536 21.5196 4.29289 21.7071C4.48043 21.8946 4.73478 22 5 22C5.26522 22 5.51957 21.8946 5.70711 21.7071C5.89464 21.5196 6 21.2652 6 21V13C6 12.7348 5.89464 12.4804 5.70711 12.2929C5.51957 12.1054 5.26522 12 5 12ZM10 2C9.73478 2 9.48043 2.10536 9.29289 2.29289C9.10536 2.48043 9 2.73478 9 3V21C9 21.2652 9.10536 21.5196 9.29289 21.7071C9.48043 21.8946 9.73478 22 10 22C10.2652 22 10.5196 21.8946 10.7071 21.7071C10.8946 21.5196 11 21.2652 11 21V3C11 2.73478 10.8946 2.48043 10.7071 2.29289C10.5196 2.10536 10.2652 2 10 2V2ZM20 16C19.7348 16 19.4804 16.1054 19.2929 16.2929C19.1054 16.4804 19 16.7348 19 17V21C19 21.2652 19.1054 21.5196 19.2929 21.7071C19.4804 21.8946 19.7348 22 20 22C20.2652 22 20.5196 21.8946 20.7071 21.7071C20.8946 21.5196 21 21.2652 21 21V17C21 16.7348 20.8946 16.4804 20.7071 16.2929C20.5196 16.1054 20.2652 16 20 16ZM15 8C14.7348 8 14.4804 8.10536 14.2929 8.29289C14.1054 8.48043 14 8.73478 14 9V21C14 21.2652 14.1054 21.5196 14.2929 21.7071C14.4804 21.8946 14.7348 22 15 22C15.2652 22 15.5196 21.8946 15.7071 21.7071C15.8946 21.5196 16 21.2652 16 21V9C16 8.73478 15.8946 8.48043 15.7071 8.29289C15.5196 8.10536 15.2652 8 15 8Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_5686_100265">
          <rect width="24" height="24" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const ExtensionIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19.4 12C19.96 12 20.24 12 20.454 11.891C20.6422 11.7951 20.7951 11.6422 20.891 11.454C21 11.24 21 10.96 21 10.4V8.2C21 7.64 21 7.36 20.891 7.146C20.7951 6.95785 20.6422 6.80487 20.454 6.709C20.24 6.6 19.96 6.6 19.4 6.6H17.85C17.6113 6.6 17.3824 6.50518 17.2136 6.3364C17.0448 6.16761 16.95 5.93869 16.95 5.7C16.95 4.98392 16.6655 4.29716 16.1592 3.79081C15.6528 3.28446 14.9661 3 14.25 3C13.5339 3 12.8472 3.28446 12.3408 3.79081C11.8345 4.29716 11.55 4.98392 11.55 5.7C11.55 5.93869 11.4552 6.16761 11.2864 6.3364C11.1176 6.50518 10.8887 6.6 10.65 6.6H9.1C8.54 6.6 8.26 6.6 8.046 6.709C7.85785 6.80487 7.70487 6.95785 7.609 7.146C7.5 7.36 7.5 7.64 7.5 8.2V10.4C7.5 10.96 7.5 11.24 7.391 11.454C7.29513 11.6422 7.14215 11.7951 6.954 11.891C6.74 12 6.46 12 5.9 12H5.7C5.34543 12 4.99433 12.0698 4.66675 12.2055C4.33918 12.3412 4.04153 12.5401 3.79081 12.7908C3.54009 13.0415 3.34121 13.3392 3.20553 13.6668C3.06984 13.9943 3 14.3454 3 14.7C3 15.0546 3.06984 15.4057 3.20553 15.7332C3.34121 16.0608 3.54009 16.3585 3.79081 16.6092C4.04153 16.8599 4.33918 17.0588 4.66675 17.1945C4.99433 17.3302 5.34543 17.4 5.7 17.4H5.9C6.46 17.4 6.74 17.4 6.954 17.509C7.14215 17.6049 7.29513 17.7578 7.391 17.946C7.5 18.16 7.5 18.44 7.5 19V19.4C7.5 19.96 7.5 20.24 7.609 20.454C7.70487 20.6422 7.85785 20.7951 8.046 20.891C8.26 21 8.54 21 9.1 21H19.4C19.96 21 20.24 21 20.454 20.891C20.6422 20.7951 20.7951 20.6422 20.891 20.454C21 20.24 21 19.96 21 19.4V19C21 18.44 21 18.16 20.891 17.946C20.7951 17.7578 20.6422 17.6049 20.454 17.509C20.24 17.4 19.96 17.4 19.4 17.4H19.2C18.4839 17.4 17.7972 17.1155 17.2908 16.6092C16.7845 16.1028 16.5 15.4161 16.5 14.7C16.5 13.9839 16.7845 13.2972 17.2908 12.7908C17.7972 12.2845 18.4839 12 19.2 12H19.4Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
export const DepartmentIcon1 = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 2C10.2652 2 10.5196 2.10536 10.7071 2.29289C10.8946 2.48043 11 2.73478 11 3V7C11 7.26522 10.8946 7.51957 10.7071 7.70711C10.5196 7.89464 10.2652 8 10 8H8V10H13V9C13 8.73478 13.1054 8.48043 13.2929 8.29289C13.4804 8.10536 13.7348 8 14 8H20C20.2652 8 20.5196 8.10536 20.7071 8.29289C20.8946 8.48043 21 8.73478 21 9V13C21 13.2652 20.8946 13.5196 20.7071 13.7071C20.5196 13.8946 20.2652 14 20 14H14C13.7348 14 13.4804 13.8946 13.2929 13.7071C13.1054 13.5196 13 13.2652 13 13V12H8V18H13V17C13 16.7348 13.1054 16.4804 13.2929 16.2929C13.4804 16.1054 13.7348 16 14 16H20C20.2652 16 20.5196 16.1054 20.7071 16.2929C20.8946 16.4804 21 16.7348 21 17V21C21 21.2652 20.8946 21.5196 20.7071 21.7071C20.5196 21.8946 20.2652 22 20 22H14C13.7348 22 13.4804 21.8946 13.2929 21.7071C13.1054 21.5196 13 21.2652 13 21V20H7C6.73478 20 6.48043 19.8946 6.29289 19.7071C6.10536 19.5196 6 19.2652 6 19V8H4C3.73478 8 3.48043 7.89464 3.29289 7.70711C3.10536 7.51957 3 7.26522 3 7V3C3 2.73478 3.10536 2.48043 3.29289 2.29289C3.48043 2.10536 3.73478 2 4 2H10ZM19 18H15V20H19V18ZM19 10H15V12H19V10ZM9 4H5V6H9V4Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const InventoryIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5.93555 22C5.38555 22 4.91488 21.8043 4.52355 21.413C4.13221 21.0217 3.93621 20.5507 3.93555 20V8.725C3.63555 8.54167 3.39388 8.30433 3.21055 8.013C3.02721 7.72167 2.93555 7.384 2.93555 7V4C2.93555 3.45 3.13155 2.97933 3.52355 2.588C3.91555 2.19667 4.38621 2.00067 4.93555 2H20.9355C21.4855 2 21.9565 2.196 22.3485 2.588C22.7405 2.98 22.9362 3.45067 22.9355 4V7C22.9355 7.38333 22.8439 7.721 22.6605 8.013C22.4772 8.305 22.2355 8.542 21.9355 8.724V20C21.9355 20.55 21.7399 21.021 21.3485 21.413C20.9572 21.805 20.4862 22.0007 19.9355 22H5.93555ZM5.93555 9V20H19.9355V9H5.93555ZM4.93555 7H20.9355V4H4.93555V7ZM9.93555 14H15.9355V12H9.93555V14Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CallQueue = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M17.3801 10.38V13.61C17.3801 16.3 16.3001 17.38 13.6101 17.38H10.3801C7.69011 17.38 6.61011 16.3 6.61011 13.61V10.38C6.61011 7.69 7.69011 6.60999 10.3801 6.60999H13.6101C16.3101 6.61999 17.3801 7.69 17.3801 10.38Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M22 5.76999V9C22 11.69 20.92 12.77 18.23 12.77H17.38V10.39C17.38 7.70001 16.3 6.62 13.61 6.62H11.23V5.76999C11.23 3.07999 12.31 2 15 2H18.23C20.92 2 22 3.07999 22 5.76999Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M2 18.23V15C2 12.31 3.08 11.23 5.77 11.23H6.62V13.61C6.62 16.3 7.7 17.38 10.39 17.38H12.77V18.23C12.77 20.92 11.69 22 9 22H5.77C3.08 22 2 20.92 2 18.23Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
export const Paging = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM10.13 14.5C10.42 14.79 10.42 15.27 10.13 15.56C9.98 15.71 9.79 15.78 9.6 15.78C9.41 15.78 9.22 15.71 9.07 15.56L6.58 13.07C5.99 12.48 5.99 11.53 6.58 10.94L9.07 8.45C9.36 8.16 9.84 8.16 10.13 8.45C10.42 8.74 10.42 9.22 10.13 9.51L7.64 12L10.13 14.5ZM17.42 13.06L14.93 15.55C14.78 15.7 14.59 15.77 14.4 15.77C14.21 15.77 14.02 15.7 13.87 15.55C13.58 15.26 13.58 14.78 13.87 14.49L16.36 12L13.87 9.5C13.58 9.21 13.58 8.73 13.87 8.44C14.16 8.15 14.64 8.15 14.93 8.44L17.42 10.93C18.01 11.52 18.01 12.48 17.42 13.06Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Share = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20.36 12.7301C19.99 12.7301 19.68 12.4501 19.64 12.0801C19.4 9.88007 18.22 7.90007 16.4 6.64007C16.07 6.41007 15.99 5.96007 16.22 5.63007C16.45 5.30007 16.9 5.22007 17.23 5.45007C19.4 6.96007 20.8 9.32007 21.09 11.9301C21.13 12.3301 20.84 12.6901 20.44 12.7301C20.41 12.7301 20.39 12.7301 20.36 12.7301Z"
        fill="currentColor"
      />
      <path
        d="M3.73998 12.78C3.71998 12.78 3.68998 12.78 3.66998 12.78C3.26998 12.74 2.97998 12.38 3.01998 11.98C3.28998 9.36996 4.66998 7.00996 6.81998 5.48996C7.13998 5.25996 7.59998 5.33996 7.82998 5.65996C8.05998 5.98996 7.97998 6.43996 7.65998 6.66996C5.85998 7.94996 4.68998 9.92996 4.46998 12.12C4.42998 12.5 4.10998 12.78 3.73998 12.78Z"
        fill="currentColor"
      />
      <path
        d="M15.99 21.1001C14.76 21.6901 13.44 21.9901 12.06 21.9901C10.62 21.9901 9.24998 21.6701 7.96998 21.0201C7.60998 20.8501 7.46998 20.4101 7.64998 20.0501C7.81998 19.6901 8.25998 19.5501 8.61998 19.7201C9.24998 20.0401 9.91998 20.2601 10.6 20.3901C11.52 20.5701 12.46 20.5801 13.38 20.4201C14.06 20.3001 14.73 20.0901 15.35 19.7901C15.72 19.6201 16.16 19.7601 16.32 20.1301C16.5 20.4901 16.36 20.9301 15.99 21.1001Z"
        fill="currentColor"
      />
      <path
        d="M12.05 2.01001C10.5 2.01001 9.22998 3.27001 9.22998 4.83001C9.22998 6.39001 10.49 7.65001 12.05 7.65001C13.61 7.65001 14.87 6.39001 14.87 4.83001C14.87 3.27001 13.61 2.01001 12.05 2.01001Z"
        fill="currentColor"
      />
      <path
        d="M5.04998 13.8701C3.49998 13.8701 2.22998 15.1301 2.22998 16.6901C2.22998 18.2501 3.48998 19.5101 5.04998 19.5101C6.60998 19.5101 7.86998 18.2501 7.86998 16.6901C7.86998 15.1301 6.59998 13.8701 5.04998 13.8701Z"
        fill="currentColor"
      />
      <path
        d="M18.95 13.8701C17.4 13.8701 16.13 15.1301 16.13 16.6901C16.13 18.2501 17.39 19.5101 18.95 19.5101C20.51 19.5101 21.77 18.2501 21.77 16.6901C21.77 15.1301 20.51 13.8701 18.95 13.8701Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CallPickupIcon = ({ className }: IconProps) => {
  return (
    <svg className={className} width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm5 7a1 1 0 1 0-2 0 1 1 0 0 0 2 0M1.807 4.734a.5.5 0 1 0-.884-.468A8 8 0 0 0 0 8c0 1.347.334 2.618.923 3.734a.5.5 0 1 0 .884-.468A7 7 0 0 1 1 8c0-1.18.292-2.292.807-3.266m13.27-.468a.5.5 0 0 0-.884.468C14.708 5.708 15 6.819 15 8c0 1.18-.292 2.292-.807 3.266a.5.5 0 0 0 .884.468A8 8 0 0 0 16 8a8 8 0 0 0-.923-3.734M3.34 6.182a.5.5 0 1 0-.93-.364A6 6 0 0 0 2 8c0 .769.145 1.505.41 2.182a.5.5 0 1 0 .93-.364A5 5 0 0 1 3 8c0-.642.12-1.255.34-1.818m10.25-.364a.5.5 0 0 0-.93.364c.22.563.34 1.176.34 1.818s-.12 1.255-.34 1.818a.5.5 0 0 0 .93.364C13.856 9.505 14 8.769 14 8s-.145-1.505-.41-2.182" />
    </svg>
  );
};
export const BookIcon = ({ className }: IconProps) => {
  return (
    <svg className={className} width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8.5 2.687c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783" />
    </svg>
  );
};
export const EmergencyCalls = ({ className }: IconProps) => {
  return (
    <svg className={className} width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877zM12.5 1a.5.5 0 0 1 .5.5V3h1.5a.5.5 0 0 1 0 1H13v1.5a.5.5 0 0 1-1 0V4h-1.5a.5.5 0 0 1 0-1H12V1.5a.5.5 0 0 1 .5-.5"
      />
    </svg>
  );
};
export const Key = ({ className }: IconProps) => {
  return (
    <svg className={className} viewBox="3.07 2.07 18.87 18.87">
      <path
        d="M3.433 17.325 3.079 19.8a1 1 0 0 0 1.131 1.131l2.475-.354C7.06 20.524 8 18 8 18s.472.405.665.466c.412.13.813-.274.948-.684L10 16.01s.577.292.786.335c.266.055.524-.109.707-.293a.988.988 0 0 0 .241-.391L12 14.01s.675.187.906.214c.263.03.519-.104.707-.293l1.138-1.137a5.502 5.502 0 0 0 5.581-1.338 5.507 5.507 0 0 0 0-7.778 5.507 5.507 0 0 0-7.778 0 5.5 5.5 0 0 0-1.338 5.581l-7.501 7.5a.994.994 0 0 0-.282.566zM18.504 5.506a2.919 2.919 0 0 1 0 4.122l-4.122-4.122a2.919 2.919 0 0 1 4.122 0z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const FileBlank = ({ className }: IconProps) => {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24">
      <path
        d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6zm8 7h-1V4l5 5h-4z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const ClockSquare = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 7.25C12.4142 7.25 12.75 7.58579 12.75 8V11.6893L15.0303 13.9697C15.3232 14.2626 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2626 15.3232 13.9697 15.0303L11.4697 12.5303C11.329 12.3897 11.25 12.1989 11.25 12V8C11.25 7.58579 11.5858 7.25 12 7.25Z"
        fill="white"
      />
    </svg>
  );
};
export const VideoLibrary = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M8.50989 2.00001H15.49C15.7225 1.99995 15.9007 1.99991 16.0565 2.01515C17.1643 2.12352 18.0711 2.78958 18.4556 3.68678H5.54428C5.92879 2.78958 6.83555 2.12352 7.94337 2.01515C8.09917 1.99991 8.27741 1.99995 8.50989 2.00001Z"
          fill="currentColor"
        />
        <path
          d="M6.31052 4.72312C4.91989 4.72312 3.77963 5.56287 3.3991 6.67691C3.39117 6.70013 3.38356 6.72348 3.37629 6.74693C3.77444 6.62636 4.18881 6.54759 4.60827 6.49382C5.68865 6.35531 7.05399 6.35538 8.64002 6.35547H15.5321C17.1181 6.35538 18.4835 6.35531 19.5639 6.49382C19.9833 6.54759 20.3977 6.62636 20.7958 6.74693C20.7886 6.72348 20.781 6.70013 20.773 6.67691C20.3925 5.56287 19.2522 4.72312 17.8616 4.72312H6.31052Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.3276 7.54204H8.67239C5.29758 7.54204 3.61017 7.54204 2.66232 8.52887C1.71447 9.5157 1.93748 11.0403 2.38351 14.0896L2.80648 16.9811C3.15626 19.3724 3.33115 20.568 4.22834 21.284C5.12553 22 6.4488 22 9.09534 22H14.9046C17.5512 22 18.8745 22 19.7717 21.284C20.6689 20.568 20.8437 19.3724 21.1935 16.9811L21.6165 14.0896C22.0625 11.0404 22.2855 9.51569 21.3377 8.52887C20.3898 7.54204 18.7024 7.54204 15.3276 7.54204ZM14.5812 15.7942C15.1396 15.4481 15.1396 14.5519 14.5812 14.2058L11.2096 12.1156C10.6669 11.7792 10 12.2171 10 12.9099V17.0901C10 17.7829 10.6669 18.2208 11.2096 17.8844L14.5812 15.7942Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const VideocameraAdd = ({ className }: IconProps) => {
  return (
    <svg
      width="35"
      height="32"
      viewBox="0 0 35 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M24.0951 12.266L31.0541 7.41268C31.1962 7.30602 31.3607 7.26602 31.5473 7.29268C31.7339 7.31935 31.8717 7.41268 31.9606 7.57268C32.0494 7.67935 32.0939 7.80379 32.0939 7.94601V24.0527C32.0939 24.2305 32.0272 24.386 31.8939 24.5193C31.7606 24.6527 31.6051 24.7193 31.4273 24.7193C31.2851 24.7193 31.1607 24.6749 31.0541 24.586L24.0951 19.7327V25.3327C24.0951 25.706 23.9663 26.0216 23.7085 26.2793C23.4508 26.5371 23.1353 26.666 22.762 26.666H4.09826C3.72499 26.666 3.40948 26.5371 3.15174 26.2793C2.89401 26.0216 2.76514 25.706 2.76514 25.3327V6.66602C2.76514 6.29268 2.89401 5.97713 3.15174 5.71935C3.40948 5.46157 3.72499 5.33268 4.09826 5.33268H22.762C23.1353 5.33268 23.4508 5.46157 23.7085 5.71935C23.9663 5.97713 24.0951 6.29268 24.0951 6.66602V12.266ZM24.0951 16.4793L29.4276 20.2127V11.786L24.0951 15.5193V16.4793ZM5.43139 7.99935V23.9993H21.4289V7.99935H5.43139ZM8.09764 10.666H10.7639V13.3327H8.09764V10.666Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CalendarAdd = ({ className }: IconProps) => {
  return (
    <svg width="33" height="32" viewBox="0 0 33 32" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M10.6589 3.33203C10.6589 2.77975 10.2111 2.33203 9.65885 2.33203C9.10657 2.33203 8.65885 2.77975 8.65885 3.33203V5.43771C6.73975 5.59138 5.47988 5.96853 4.55428 6.89413C3.62869 7.81973 3.25154 9.07959 3.09786 10.9987H29.5532C29.3995 9.07959 29.0224 7.81973 28.0968 6.89413C27.1712 5.96853 25.9113 5.59138 23.9922 5.43771V3.33203C23.9922 2.77975 23.5445 2.33203 22.9922 2.33203C22.4399 2.33203 21.9922 2.77975 21.9922 3.33203V5.34923C21.1052 5.33203 20.1109 5.33203 18.9922 5.33203H13.6589C12.5401 5.33203 11.5459 5.33203 10.6589 5.34923V3.33203Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M29.6589 15.9987V18.6654C29.6589 23.6937 29.6589 26.2078 28.0968 27.7699C26.5347 29.332 24.0205 29.332 18.9922 29.332H13.6589C8.63054 29.332 6.11638 29.332 4.55428 27.7699C2.99219 26.2078 2.99219 23.6937 2.99219 18.6654V15.9987C2.99219 14.88 2.99219 13.8857 3.00939 12.9987H29.6417C29.6589 13.8857 29.6589 14.88 29.6589 15.9987ZM21.6589 17.6654C22.2111 17.6654 22.6589 18.1131 22.6589 18.6654V20.3321L24.3255 20.3321C24.8778 20.3321 25.3255 20.7798 25.3255 21.3321C25.3255 21.8843 24.8778 22.3321 24.3255 22.3321H22.6589V23.9987C22.6589 24.551 22.2111 24.9987 21.6589 24.9987C21.1066 24.9987 20.6589 24.551 20.6589 23.9987V22.3321L18.9922 22.3321C18.4399 22.3321 17.9922 21.8843 17.9922 21.3321C17.9922 20.7798 18.4399 20.3321 18.9922 20.3321H20.6589V18.6654C20.6589 18.1131 21.1066 17.6654 21.6589 17.6654Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const Tuning = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M14.1351 8.1263C13.7899 8.1263 13.5101 7.84648 13.5101 7.5013L13.5101 1.66797C13.5101 1.32279 13.7899 1.04297 14.1351 1.04297C14.4803 1.04297 14.7601 1.32279 14.7601 1.66797L14.7601 7.5013C14.7601 7.84648 14.4803 8.1263 14.1351 8.1263Z"
          fill="currentColor"
        />
        <path
          d="M5.83594 10.418C4.45523 10.418 3.33594 9.29868 3.33594 7.91797C3.33594 6.53726 4.45523 5.41797 5.83594 5.41797C7.21665 5.41797 8.33594 6.53726 8.33594 7.91797C8.33594 9.29868 7.21665 10.418 5.83594 10.418Z"
          fill="currentColor"
        />
        <path
          d="M14.1693 9.58464C12.7886 9.58464 11.6693 10.7039 11.6693 12.0846C11.6693 13.4653 12.7886 14.5846 14.1693 14.5846C15.55 14.5846 16.6693 13.4653 16.6693 12.0846C16.6693 10.7039 15.55 9.58464 14.1693 9.58464Z"
          fill="currentColor"
        />
        <path
          d="M5.17678 12.5013C5.17678 12.1561 5.4566 11.8763 5.80178 11.8763C6.14696 11.8763 6.42678 12.1561 6.42678 12.5013V18.3346C6.42678 18.6798 6.14696 18.9596 5.80178 18.9596C5.4566 18.9596 5.17678 18.6798 5.17678 18.3346V12.5013Z"
          fill="currentColor"
        />
        <path
          d="M14.1351 18.9596C13.7899 18.9596 13.5101 18.6798 13.5101 18.3346V16.668C13.5101 16.3228 13.7899 16.043 14.1351 16.043C14.4803 16.043 14.7601 16.3228 14.7601 16.668V18.3346C14.7601 18.6798 14.4803 18.9596 14.1351 18.9596Z"
          fill="currentColor"
        />
        <path
          d="M5.17678 1.66797C5.17678 1.32279 5.4566 1.04297 5.80178 1.04297C6.14696 1.04297 6.42678 1.32279 6.42678 1.66797V3.33464C6.42678 3.67981 6.14696 3.95964 5.80178 3.95964C5.4566 3.95964 5.17678 3.67981 5.17678 3.33464V1.66797Z"
          fill="currentColor"
        />
        <path
          d="M14.1351 8.1263C13.7899 8.1263 13.5101 7.84648 13.5101 7.5013L13.5101 1.66797C13.5101 1.32279 13.7899 1.04297 14.1351 1.04297C14.4803 1.04297 14.7601 1.32279 14.7601 1.66797L14.7601 7.5013C14.7601 7.84648 14.4803 8.1263 14.1351 8.1263Z"
          stroke="currentColor"
        />
        <path
          d="M5.83594 10.418C4.45523 10.418 3.33594 9.29868 3.33594 7.91797C3.33594 6.53726 4.45523 5.41797 5.83594 5.41797C7.21665 5.41797 8.33594 6.53726 8.33594 7.91797C8.33594 9.29868 7.21665 10.418 5.83594 10.418Z"
          stroke="currentColor"
        />
        <path
          d="M14.1693 9.58464C12.7886 9.58464 11.6693 10.7039 11.6693 12.0846C11.6693 13.4653 12.7886 14.5846 14.1693 14.5846C15.55 14.5846 16.6693 13.4653 16.6693 12.0846C16.6693 10.7039 15.55 9.58464 14.1693 9.58464Z"
          stroke="currentColor"
        />
        <path
          d="M5.17678 12.5013C5.17678 12.1561 5.4566 11.8763 5.80178 11.8763C6.14696 11.8763 6.42678 12.1561 6.42678 12.5013V18.3346C6.42678 18.6798 6.14696 18.9596 5.80178 18.9596C5.4566 18.9596 5.17678 18.6798 5.17678 18.3346V12.5013Z"
          stroke="currentColor"
        />
        <path
          d="M14.1351 18.9596C13.7899 18.9596 13.5101 18.6798 13.5101 18.3346V16.668C13.5101 16.3228 13.7899 16.043 14.1351 16.043C14.4803 16.043 14.7601 16.3228 14.7601 16.668V18.3346C14.7601 18.6798 14.4803 18.9596 14.1351 18.9596Z"
          stroke="currentColor"
        />
        <path
          d="M5.17678 1.66797C5.17678 1.32279 5.4566 1.04297 5.80178 1.04297C6.14696 1.04297 6.42678 1.32279 6.42678 1.66797V3.33464C6.42678 3.67981 6.14696 3.95964 5.80178 3.95964C5.4566 3.95964 5.17678 3.67981 5.17678 3.33464V1.66797Z"
          stroke="currentColor"
        />
      </g>
    </svg>
  );
};
export const PlayCircleLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9" clipPath="url(#clip0_1240_71168)">
        <path
          d="M11.5704 8.28031C12.4662 9.01104 12.9141 9.3764 12.9141 10.0013C12.9141 10.6262 12.4662 10.9916 11.5704 11.7223C11.3231 11.924 11.0779 12.1139 10.8525 12.2722C10.6548 12.411 10.4308 12.5547 10.199 12.6956C9.30534 13.2391 8.8585 13.5108 8.45774 13.21C8.05698 12.9091 8.02056 12.2793 7.94771 11.0198C7.92711 10.6636 7.91406 10.3144 7.91406 10.0013C7.91406 9.68825 7.92711 9.33905 7.94771 8.98284C8.02056 7.72326 8.05698 7.09348 8.45774 6.79263C8.8585 6.49179 9.30534 6.76352 10.199 7.30696C10.4308 7.44794 10.6548 7.59156 10.8525 7.7304C11.0779 7.88866 11.3231 8.07858 11.5704 8.28031Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M5.83073 2.78282C7.05645 2.07378 8.47953 1.66797 9.9974 1.66797C14.5998 1.66797 18.3307 5.39893 18.3307 10.0013C18.3307 14.6037 14.5998 18.3346 9.9974 18.3346C5.39502 18.3346 1.66406 14.6037 1.66406 10.0013C1.66406 8.48344 2.06987 7.06036 2.77891 5.83464"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1240_71168">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const ForwardIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M13.9546 5.68341L18.9324 10.1082C19.863 10.9353 20.3283 11.3489 20.4998 11.8373C20.6503 12.2662 20.6503 12.7335 20.4998 13.1624C20.3283 13.6508 19.863 14.0644 18.9324 14.8916L13.9546 19.3163C13.5323 19.6917 13.3211 19.8794 13.1418 19.8861C12.986 19.8919 12.8364 19.8247 12.7372 19.7044C12.6231 19.5659 12.6231 19.2834 12.6231 18.7184V15.9284C10.195 15.9284 7.63044 16.7083 5.75782 18.0926C4.78293 18.8133 4.29546 19.1737 4.1098 19.1595C3.92883 19.1456 3.81398 19.075 3.72008 18.9196C3.62374 18.7603 3.70883 18.2624 3.879 17.2666C4.98397 10.8004 9.43394 9.07129 12.6231 9.07129V6.28134C12.6231 5.71632 12.6231 5.43381 12.7372 5.29531C12.8364 5.17498 12.986 5.1078 13.1418 5.11363C13.3211 5.12034 13.5323 5.30803 13.9546 5.68341Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const DownloadLine = ({ className }: IconProps) => {
  return (
    <svg width="24" height="25" viewBox="0 0 24 25" fill="none" className={className}>
      <path d="M12 4.5H14V10.5H16.5L12 15M12 4.5H10V10.5H7.5L12 15" fill="currentColor" />
      <path
        d="M12 4.5H14V10.5H16.5L12 15L7.5 10.5H10V4.5H12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 19.5H18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const PenSquare = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M17.6589 2.33984C18.5547 3.23567 18.5547 4.68809 17.6589 5.58392L17.2459 5.99687C17.1257 5.97084 16.9742 5.93121 16.8016 5.87133C16.3397 5.71107 15.7326 5.40819 15.1616 4.83714C14.5905 4.26608 14.2876 3.65899 14.1274 3.19705C14.0675 3.02447 14.0279 2.87304 14.0018 2.7528L14.4148 2.33984C15.3106 1.44401 16.763 1.44401 17.6589 2.33984Z"
          fill="currentColor"
        />
        <path
          d="M12.1475 11.0953C11.8108 11.432 11.6424 11.6003 11.4568 11.7451C11.2379 11.9159 11.001 12.0623 10.7503 12.1818C10.5378 12.283 10.312 12.3583 9.86025 12.5089L7.4783 13.3029C7.25602 13.377 7.01095 13.3191 6.84526 13.1534C6.67958 12.9878 6.62173 12.7427 6.69582 12.5204L7.48981 10.1384C7.64037 9.68675 7.71566 9.4609 7.81693 9.2484C7.93639 8.99773 8.08281 8.76083 8.25359 8.54187C8.39836 8.35626 8.5667 8.18792 8.90338 7.85124L13.0001 3.75451C13.2199 4.333 13.6052 5.0485 14.2777 5.72102C14.9502 6.39355 15.6657 6.77877 16.2442 6.99859L12.1475 11.0953Z"
          fill="currentColor"
        />
        <path
          d="M17.1103 17.1142C18.3307 15.8939 18.3307 13.9297 18.3307 10.0013C18.3307 8.71109 18.3307 7.63275 18.2875 6.72305L12.9857 12.0249C12.693 12.3177 12.4731 12.5377 12.2256 12.7307C11.9351 12.9574 11.6207 13.1517 11.2881 13.3102C11.0047 13.4452 10.7096 13.5435 10.3168 13.6743L7.87359 14.4887C7.20213 14.7125 6.46185 14.5378 5.96138 14.0373C5.46091 13.5368 5.28615 12.7966 5.50997 12.1251L6.32436 9.68192C6.45519 9.28909 6.5535 8.99395 6.68852 8.71062C6.84704 8.378 7.04133 8.06364 7.26795 7.7731C7.46098 7.52562 7.681 7.3057 7.97384 7.013L13.2756 1.7112C12.3659 1.66797 11.2876 1.66797 9.9974 1.66797C6.06903 1.66797 4.10484 1.66797 2.88445 2.88836C1.66406 4.10875 1.66406 6.07293 1.66406 10.0013C1.66406 13.9297 1.66406 15.8939 2.88445 17.1142C4.10484 18.3346 6.06903 18.3346 9.9974 18.3346C13.9258 18.3346 15.89 18.3346 17.1103 17.1142Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const NotesMinimalistic = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M16.718 10.5407L17.1494 8.93082L17.1494 8.93081C17.6529 7.05158 17.9047 6.11197 17.7151 5.29882C17.5654 4.65677 17.2287 4.07354 16.7475 3.62286C16.1381 3.05209 15.1985 2.80032 13.3192 2.29679C11.44 1.79325 10.5004 1.54148 9.68722 1.73108C9.04517 1.88078 8.46193 2.21751 8.01126 2.69869C7.52258 3.22045 7.26774 3.98428 6.88851 5.37265C6.82481 5.60584 6.75761 5.85664 6.6852 6.12688L6.68518 6.12695L6.25382 7.73682C5.75028 9.61606 5.49851 10.5557 5.68811 11.3688C5.83781 12.0109 6.17454 12.5941 6.65572 13.0448C7.26513 13.6155 8.20474 13.8673 10.084 14.3709L10.084 14.3709C11.7778 14.8247 12.7083 15.074 13.4708 14.98C13.5543 14.9697 13.6358 14.9553 13.716 14.9366C14.358 14.7869 14.9413 14.4501 15.3919 13.969C15.9627 13.3595 16.2145 12.4199 16.718 10.5407Z"
          fill="currentColor"
        />
        <path
          d="M2.08975 12.2625L2.52112 13.8724C3.02466 15.7516 3.27643 16.6912 3.8472 17.3007C4.29787 17.7818 4.88111 18.1186 5.52316 18.2683C6.3363 18.4579 7.27592 18.2061 9.15515 17.7026L9.15515 17.7026C11.0344 17.199 11.974 16.9473 12.5834 16.3765C12.634 16.3291 12.683 16.2803 12.7303 16.2301C12.4518 16.2067 12.1709 16.1619 11.8855 16.1051C11.3054 15.9898 10.6161 15.8051 9.80093 15.5866L9.71193 15.5628L9.69131 15.5573C8.80433 15.3196 8.06328 15.1206 7.47158 14.9069C6.84933 14.6821 6.28394 14.405 5.80384 13.9553C5.14222 13.3356 4.67921 12.5337 4.47337 11.6509C4.32399 11.0103 4.3667 10.3821 4.48316 9.73079C4.59476 9.10668 4.79518 8.35874 5.03532 7.46262L5.03532 7.46261L5.48065 5.80064L5.49631 5.74219C3.89586 6.17332 3.05345 6.4284 2.49166 6.95457C2.01048 7.40524 1.67375 7.98848 1.52404 8.63053C1.33445 9.44367 1.58622 10.3833 2.08975 12.2625Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const PlayFill = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.72063 3.96704C4.74313 3.77782 4.80947 3.59646 4.91436 3.43738C5.01925 3.2783 5.15981 3.14589 5.32486 3.05066C5.48991 2.95543 5.6749 2.90002 5.86512 2.88883C6.05534 2.87764 6.24555 2.91098 6.42063 2.98621C7.30563 3.36454 9.28896 4.26371 11.8056 5.71621C14.3231 7.16954 16.094 8.43871 16.8631 9.01454C17.5198 9.50704 17.5215 10.4837 16.864 10.9779C16.1023 11.5504 14.3531 12.8029 11.8056 14.2745C9.25562 15.7462 7.29562 16.6345 6.41896 17.0079C5.66396 17.3304 4.81896 16.8412 4.72063 16.027C4.60563 15.0754 4.39062 12.9145 4.39062 9.9962C4.39062 7.07954 4.60479 4.91954 4.72063 3.96704Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const ChatSearch = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.55167 16.6654H3.33333C3.11232 16.6654 2.90036 16.5776 2.74408 16.4213C2.5878 16.265 2.5 16.053 2.5 15.832V6.66536C2.5 5.78131 2.85119 4.93346 3.47631 4.30834C4.10143 3.68322 4.94928 3.33203 5.83333 3.33203H14.1667C15.0507 3.33203 15.8986 3.68322 16.5237 4.30834C17.1488 4.93346 17.5 5.78131 17.5 6.66536V9.4862M5.83333 11.6654H8.33333M5.83333 8.33203H10.8333"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.7474 14.9987C14.898 14.9987 15.8307 14.066 15.8307 12.9154C15.8307 11.7648 14.898 10.832 13.7474 10.832C12.5968 10.832 11.6641 11.7648 11.6641 12.9154C11.6641 14.066 12.5968 14.9987 13.7474 14.9987Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M15.4141 14.582L17.9141 17.082"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const NetworkBars = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20.0811 1.30469V22.6984H22.9358V1.30469H20.0811ZM15.328 7.88594V22.6984H18.178V7.88594H15.328ZM10.5655 12.8266V22.6984H13.4248V12.8266H10.5655ZM5.81234 16.1172V22.6984H8.66703V16.1172H5.81234ZM1.0625 18.5125V22.6984H3.91438V18.5125H1.0625Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UploadIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g clipPath="url(#clip0_1240_69529)">
        <path
          d="M16 2L21 7V21.008C20.9997 21.2712 20.895 21.5235 20.7088 21.7095C20.5226 21.8955 20.2702 22 20.007 22H3.993C3.73038 21.9982 3.47902 21.8931 3.29322 21.7075C3.10742 21.5219 3.00209 21.2706 3 21.008V2.992C3 2.444 3.445 2 3.993 2H16ZM13 12H16L12 8L8 12H11V16H13V12Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1240_69529">
          <rect width="24" height="24" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const Invite = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M19 17V19H7V17C7 17 7 13 13 13C19 13 19 17 19 17ZM16 8C16 7.40666 15.8241 6.82664 15.4944 6.33329C15.1648 5.83994 14.6962 5.45543 14.1481 5.22836C13.5999 5.0013 12.9967 4.94189 12.4147 5.05765C11.8328 5.1734 11.2982 5.45912 10.8787 5.87868C10.4591 6.29824 10.1734 6.83279 10.0576 7.41473C9.94189 7.99667 10.0013 8.59987 10.2284 9.14805C10.4554 9.69623 10.8399 10.1648 11.3333 10.4944C11.8266 10.8241 12.4067 11 13 11C13.7956 11 14.5587 10.6839 15.1213 10.1213C15.6839 9.55871 16 8.79565 16 8ZM19.2 13.06C19.7466 13.5643 20.1873 14.1724 20.4964 14.8489C20.8054 15.5254 20.9766 16.2566 21 17V19H24V17C24 17 24 13.55 19.2 13.06ZM18 5C17.6979 5.00002 17.3976 5.04726 17.11 5.14C17.6951 5.97897 18.0087 6.97718 18.0087 8C18.0087 9.02282 17.6951 10.021 17.11 10.86C17.3976 10.9527 17.6979 11 18 11C18.7956 11 19.5587 10.6839 20.1213 10.1213C20.6839 9.55871 21 8.79565 21 8C21 7.20435 20.6839 6.44129 20.1213 5.87868C19.5587 5.31607 18.7956 5 18 5ZM8 10H5V7H3V10H0V12H3V15H5V12H8V10Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Chat2 = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2 22V4C2 3.45 2.196 2.97933 2.588 2.588C2.98 2.19667 3.45067 2.00067 4 2H20C20.55 2 21.021 2.196 21.413 2.588C21.805 2.98 22.0007 3.45067 22 4V16C22 16.55 21.8043 17.021 21.413 17.413C21.0217 17.805 20.5507 18.0007 20 18H6L2 22ZM6 14H14V12H6V14ZM6 11H18V9H6V11ZM6 8H18V6H6V8Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AddReaction = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12.003 21C10.759 21 9.589 20.764 8.493 20.292C7.39767 19.8193 6.44467 19.178 5.634 18.368C4.82333 17.558 4.18167 16.606 3.709 15.512C3.23633 14.418 3 13.2483 3 12.003C3 10.7577 3.23633 9.58767 3.709 8.49301C4.18167 7.39767 4.823 6.44467 5.633 5.63401C6.443 4.82334 7.39533 4.18167 8.49 3.70901C9.58467 3.23634 10.7547 3.00001 12 3.00001C12.5413 3.00001 13.0753 3.04501 13.602 3.13501C14.1287 3.22434 14.6377 3.36101 15.129 3.54501C15.3237 3.61501 15.4727 3.73434 15.576 3.90301C15.6793 4.07101 15.731 4.25601 15.731 4.45801V4.92101C15.731 5.35834 15.8847 5.73101 16.192 6.03901C16.5 6.34634 16.8723 6.50001 17.309 6.50001H18.481V8.22901C18.481 8.50901 18.5843 8.75234 18.791 8.95901C18.9977 9.16567 19.241 9.26901 19.521 9.26901H19.892C20.0913 9.26901 20.2743 9.33001 20.441 9.45201C20.6077 9.57401 20.719 9.73701 20.775 9.94101C20.8583 10.2717 20.9167 10.6067 20.95 10.946C20.9833 11.2853 21 11.6367 21 12C21 13.2453 20.764 14.4153 20.292 15.51C19.82 16.6047 19.179 17.5573 18.369 18.368C17.559 19.1787 16.6067 19.8197 15.512 20.291C14.4173 20.7623 13.2477 20.9987 12.003 21ZM12 16.884C12.8287 16.884 13.593 16.6923 14.293 16.309C14.993 15.9257 15.5663 15.406 16.013 14.75C16.1017 14.586 16.1037 14.42 16.019 14.252C15.9343 14.084 15.7947 14 15.6 14H8.4C8.20533 14 8.06533 14.084 7.98 14.252C7.896 14.42 7.89867 14.586 7.988 14.75C8.43467 15.4067 9.01133 15.9267 9.718 16.31C10.4247 16.6933 11.1853 16.884 12 16.884ZM8.697 10.615C9.00833 10.615 9.27133 10.5063 9.486 10.289C9.70067 10.071 9.808 9.80667 9.808 9.49601C9.808 9.18467 9.699 8.92134 9.481 8.70601C9.26367 8.49201 8.99933 8.38501 8.688 8.38501C8.37667 8.38501 8.11367 8.49367 7.899 8.71101C7.68433 8.92834 7.577 9.19267 7.577 9.50401C7.577 9.81534 7.68567 10.0787 7.903 10.294C8.121 10.5087 8.38567 10.616 8.697 10.616M15.312 10.616C15.6233 10.616 15.8863 10.507 16.101 10.289C16.3157 10.071 16.423 9.80667 16.423 9.49601C16.423 9.18534 16.3143 8.92201 16.097 8.70601C15.879 8.49201 15.6143 8.38501 15.303 8.38501C14.9917 8.38501 14.7287 8.49367 14.514 8.71101C14.2993 8.92834 14.192 9.19267 14.192 9.50401C14.192 9.81534 14.301 10.0787 14.519 10.294C14.7363 10.5087 15.0007 10.616 15.312 10.616ZM20.5 4.50001H19C18.858 4.50001 18.7393 4.45201 18.644 4.35601C18.5487 4.26001 18.5007 4.14101 18.5 3.99901C18.4993 3.85701 18.5473 3.73834 18.644 3.64301C18.7407 3.54767 18.8593 3.50001 19 3.50001H20.5V2.00001C20.5 1.85801 20.548 1.73934 20.644 1.64401C20.74 1.54867 20.859 1.50067 21.001 1.50001C21.143 1.49934 21.2617 1.54734 21.357 1.64401C21.4523 1.74067 21.5 1.85934 21.5 2.00001V3.50001H23C23.142 3.50001 23.2607 3.54801 23.356 3.64401C23.4513 3.74001 23.4993 3.85901 23.5 4.00101C23.5007 4.14301 23.4527 4.26167 23.356 4.35701C23.2593 4.45234 23.1407 4.50001 23 4.50001H21.5V6.00001C21.5 6.14201 21.452 6.26067 21.356 6.35601C21.26 6.45134 21.141 6.49934 20.999 6.50001C20.857 6.50067 20.7383 6.45267 20.643 6.35601C20.5477 6.25934 20.5 6.14067 20.5 6.00001V4.50001Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Headphones = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M2.75006 18.6498C2.34006 18.6498 2.00006 18.3098 2.00006 17.8998V12.1998C1.95006 9.4898 2.96006 6.9298 4.84006 5.0098C6.72006 3.0998 9.24006 2.0498 11.9501 2.0498C17.4901 2.0498 22.0001 6.5598 22.0001 12.0998V17.7998C22.0001 18.2098 21.6601 18.5498 21.2501 18.5498C20.8401 18.5498 20.5001 18.2098 20.5001 17.7998V12.0998C20.5001 7.3898 16.6701 3.5498 11.9501 3.5498C9.64006 3.5498 7.50006 4.43981 5.91006 6.0598C4.31006 7.68981 3.46006 9.85981 3.50006 12.1798V17.8898C3.50006 18.3098 3.17006 18.6498 2.75006 18.6498Z"
        fill="currentColor"
      />
      <path
        d="M5.94 12.4502H5.81C3.71 12.4502 2 14.1602 2 16.2602V18.1402C2 20.2402 3.71 21.9502 5.81 21.9502H5.94C8.04 21.9502 9.75 20.2402 9.75 18.1402V16.2602C9.75 14.1602 8.04 12.4502 5.94 12.4502Z"
        fill="currentColor"
      />
      <path
        d="M18.19 12.4502H18.06C15.96 12.4502 14.25 14.1602 14.25 16.2602V18.1402C14.25 20.2402 15.96 21.9502 18.06 21.9502H18.19C20.29 21.9502 22 20.2402 22 18.1402V16.2602C22 14.1602 20.29 12.4502 18.19 12.4502Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Mic = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8.0026 9.33203C7.44705 9.33203 6.97483 9.13759 6.58594 8.7487C6.19705 8.35981 6.0026 7.88759 6.0026 7.33203V3.33203C6.0026 2.77648 6.19705 2.30425 6.58594 1.91536C6.97483 1.52648 7.44705 1.33203 8.0026 1.33203C8.55816 1.33203 9.03038 1.52648 9.41927 1.91536C9.80816 2.30425 10.0026 2.77648 10.0026 3.33203V7.33203C10.0026 7.88759 9.80816 8.35981 9.41927 8.7487C9.03038 9.13759 8.55816 9.33203 8.0026 9.33203ZM7.33594 13.9987V11.9487C6.18038 11.7931 5.22483 11.2765 4.46927 10.3987C3.71372 9.52092 3.33594 8.4987 3.33594 7.33203H4.66927C4.66927 8.25425 4.99438 9.04048 5.6446 9.6907C6.29483 10.3409 7.08083 10.6658 8.0026 10.6654C8.92438 10.6649 9.7106 10.3398 10.3613 9.69003C11.0119 9.04025 11.3368 8.25425 11.3359 7.33203H12.6693C12.6693 8.4987 12.2915 9.52092 11.5359 10.3987C10.7804 11.2765 9.82483 11.7931 8.66927 11.9487V13.9987H7.33594Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UserAdd = ({ className }: IconProps) => {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" className={className}>
      <path
        d="M15.6016 14C12.9316 14 7.60156 15.33 7.60156 18V20H23.6016V18C23.6016 15.33 18.2716 14 15.6016 14ZM6.60156 10V7H4.60156V10H1.60156V12H4.60156V15H6.60156V12H9.60156V10M15.6016 12C16.6624 12 17.6798 11.5786 18.43 10.8284C19.1801 10.0783 19.6016 9.06087 19.6016 8C19.6016 6.93913 19.1801 5.92172 18.43 5.17157C17.6798 4.42143 16.6624 4 15.6016 4C14.5407 4 13.5233 4.42143 12.7731 5.17157C12.023 5.92172 11.6016 6.93913 11.6016 8C11.6016 9.06087 12.023 10.0783 12.7731 10.8284C13.5233 11.5786 14.5407 12 15.6016 12Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const LockFilled = ({ className }: IconProps) => {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" className={className}>
      <path
        d="M12.2031 2C13.5292 2 14.801 2.52678 15.7387 3.46447C16.6763 4.40215 17.2031 5.67392 17.2031 7V10C17.9988 10 18.7618 10.3161 19.3244 10.8787C19.8871 11.4413 20.2031 12.2044 20.2031 13V19C20.2031 19.7956 19.8871 20.5587 19.3244 21.1213C18.7618 21.6839 17.9988 22 17.2031 22H7.20312C6.40748 22 5.64441 21.6839 5.0818 21.1213C4.5192 20.5587 4.20313 19.7956 4.20312 19V13C4.20312 12.2044 4.5192 11.4413 5.0818 10.8787C5.64441 10.3161 6.40748 10 7.20312 10V7C7.20312 5.67392 7.72991 4.40215 8.66759 3.46447C9.60527 2.52678 10.877 2 12.2031 2ZM12.2031 14C11.6985 13.9998 11.2126 14.1904 10.8426 14.5335C10.4726 14.8766 10.246 15.3468 10.2081 15.85L10.2031 16C10.2031 16.3956 10.3204 16.7822 10.5402 17.1111C10.7599 17.44 11.0723 17.6964 11.4378 17.8478C11.8032 17.9991 12.2053 18.0387 12.5933 17.9616C12.9813 17.8844 13.3376 17.6939 13.6173 17.4142C13.897 17.1345 14.0875 16.7781 14.1647 16.3902C14.2419 16.0022 14.2023 15.6001 14.0509 15.2346C13.8995 14.8692 13.6432 14.5568 13.3143 14.3371C12.9854 14.1173 12.5987 14 12.2031 14ZM12.2031 4C11.4075 4 10.6444 4.31607 10.0818 4.87868C9.5192 5.44129 9.20312 6.20435 9.20312 7V10H15.2031V7C15.2031 6.20435 14.8871 5.44129 14.3244 4.87868C13.7618 4.31607 12.9988 4 12.2031 4Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MicOffFill = ({ className }: IconProps) => {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" className={className}>
      <path
        d="M5.73013 12.01C5.99239 11.9729 6.25866 12.0413 6.47051 12.2003C6.68236 12.3593 6.82249 12.5958 6.86013 12.858C6.9853 13.7269 7.29961 14.5578 7.7809 15.292C8.26219 16.0262 8.89872 16.6458 9.6456 17.1072C10.3925 17.5685 11.2315 17.8604 12.1035 17.9621C12.9754 18.0639 13.8591 17.973 14.6921 17.696L14.9851 17.589L16.4941 19.098C15.7608 19.4794 14.9728 19.7449 14.1581 19.885L13.8001 19.938V21C13.7998 21.2549 13.7023 21.5 13.5273 21.6854C13.3523 21.8707 13.1132 21.9822 12.8587 21.9972C12.6043 22.0121 12.3538 21.9293 12.1583 21.7657C11.9628 21.6021 11.8372 21.3701 11.8071 21.117L11.8001 21V19.938C10.0621 19.7184 8.4441 18.9347 7.1943 17.7071C5.94449 16.4795 5.13189 14.8758 4.88113 13.142C4.86247 13.012 4.8696 12.8796 4.90211 12.7523C4.93463 12.6251 4.9919 12.5055 5.07064 12.4003C5.14939 12.2952 5.24807 12.2066 5.36106 12.1397C5.47404 12.0727 5.60012 12.0286 5.73013 12.01ZM12.8001 2C14.0886 2.00007 15.3273 2.49754 16.2579 3.38866C17.1885 4.27978 17.7392 5.49575 17.7951 6.783L17.8001 7V12C17.8004 12.8925 17.5619 13.7688 17.1091 14.538L16.9721 14.758L17.6911 15.477C18.2331 14.717 18.6011 13.825 18.7391 12.858C18.7768 12.5954 18.9172 12.3586 19.1295 12.1996C19.3418 12.0405 19.6086 11.9723 19.8711 12.01C20.1337 12.0477 20.3705 12.1881 20.5296 12.4004C20.6886 12.6127 20.7568 12.8794 20.7191 13.142C20.5379 14.4095 20.0535 15.6146 19.3071 16.655L19.1201 16.905L21.2851 19.071C21.4645 19.251 21.5686 19.4924 21.5764 19.7464C21.5841 20.0003 21.4949 20.2477 21.3269 20.4383C21.1588 20.6288 20.9246 20.7483 20.6717 20.7724C20.4187 20.7965 20.1661 20.7234 19.9651 20.568L19.8711 20.485L4.31513 4.93C4.13578 4.75004 4.03166 4.50857 4.0239 4.25462C4.01615 4.00067 4.10535 3.75329 4.27338 3.56272C4.44141 3.37216 4.67568 3.25269 4.92861 3.2286C5.18153 3.20451 5.43414 3.27759 5.63513 3.433L5.72913 3.516L7.95913 5.746C8.237 4.6735 8.8632 3.72366 9.73942 3.04564C10.6156 2.36762 11.6922 1.99982 12.8001 2ZM7.80013 10.404L14.1981 16.802C13.4529 17.019 12.6674 17.0596 11.9038 16.9204C11.1402 16.7813 10.4195 16.4663 9.79873 16.0004C9.17796 15.5344 8.67418 14.9304 8.32729 14.2361C7.98039 13.5417 7.79991 12.7762 7.80013 12V10.404Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MicFill = ({ className }: IconProps) => {
  return (
    <svg width="18" height="24" viewBox="0 0 18 24" fill="none" className={className}>
      <path
        d="M8.8 16.8C10.0726 16.7987 11.2928 16.2925 12.1926 15.3927C13.0925 14.4928 13.5987 13.2726 13.6 12V4.8C13.6 3.52696 13.0943 2.30606 12.1941 1.40589C11.2939 0.505713 10.073 0 8.8 0C7.52696 0 6.30606 0.505713 5.40589 1.40589C4.50571 2.30606 4 3.52696 4 4.8V12C4.00132 13.2726 4.50746 14.4928 5.40735 15.3927C6.30724 16.2925 7.52737 16.7987 8.8 16.8Z"
        fill="currentColor"
      />
      <path
        d="M17.1984 11.9984V9.59844C17.1984 9.28018 17.072 8.97495 16.847 8.74991C16.6219 8.52487 16.3167 8.39844 15.9984 8.39844C15.6802 8.39844 15.375 8.52487 15.1499 8.74991C14.9249 8.97495 14.7984 9.28018 14.7984 9.59844V11.9984C14.7984 13.5897 14.1663 15.1159 13.0411 16.2411C11.9159 17.3663 10.3897 17.9984 8.79844 17.9984C7.20714 17.9984 5.68102 17.3663 4.5558 16.2411C3.43058 15.1159 2.79844 13.5897 2.79844 11.9984V9.59844C2.79844 9.28018 2.67201 8.97495 2.44697 8.74991C2.22192 8.52487 1.9167 8.39844 1.59844 8.39844C1.28018 8.39844 0.974953 8.52487 0.749909 8.74991C0.524866 8.97495 0.398438 9.28018 0.398438 9.59844L0.398438 11.9984C0.401843 14.0084 1.12537 15.9507 2.43785 17.473C3.75032 18.9954 5.56485 19.9971 7.55244 20.2964L7.59844 20.3024V21.5984H3.99844C3.84085 21.5984 3.68481 21.6295 3.53922 21.6898C3.39363 21.7501 3.26134 21.8385 3.14991 21.9499C3.03848 22.0613 2.95009 22.1936 2.88978 22.3392C2.82948 22.4848 2.79844 22.6409 2.79844 22.7984C2.79844 22.956 2.82948 23.1121 2.88978 23.2577C2.95009 23.4032 3.03848 23.5355 3.14991 23.647C3.26134 23.7584 3.39363 23.8468 3.53922 23.9071C3.68481 23.9674 3.84085 23.9984 3.99844 23.9984H13.5984C13.756 23.9984 13.9121 23.9674 14.0577 23.9071C14.2032 23.8468 14.3355 23.7584 14.447 23.647C14.5584 23.5355 14.6468 23.4032 14.7071 23.2577C14.7674 23.1121 14.7984 22.956 14.7984 22.7984C14.7984 22.6409 14.7674 22.4848 14.7071 22.3392C14.6468 22.1936 14.5584 22.0613 14.447 21.9499C14.3355 21.8385 14.2032 21.7501 14.0577 21.6898C13.9121 21.6295 13.756 21.5984 13.5984 21.5984H9.99844V20.3024C14.0884 19.6934 17.1914 16.2094 17.1984 11.9994V11.9984Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const VideoOffFilled = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M2.18612 1.47945C2.14034 1.43033 2.08514 1.39093 2.02381 1.3636C1.96248 1.33627 1.89627 1.32157 1.82913 1.32039C1.762 1.31921 1.69531 1.33156 1.63305 1.3567C1.57079 1.38185 1.51424 1.41928 1.46676 1.46676C1.41928 1.51424 1.38185 1.57079 1.3567 1.63305C1.33156 1.69531 1.31921 1.762 1.32039 1.82913C1.32157 1.89627 1.33627 1.96248 1.3636 2.02381C1.39093 2.08514 1.43033 2.14034 1.47945 2.18612L2.75612 3.46345C2.33872 3.6159 1.97829 3.89301 1.72368 4.25721C1.46908 4.62141 1.33261 5.05508 1.33278 5.49945V10.4995C1.33278 11.0741 1.56106 11.6252 1.96739 12.0315C2.37372 12.4378 2.92482 12.6661 3.49945 12.6661H7.83278C8.37321 12.6662 8.89417 12.4643 9.29342 12.1001C9.69267 11.7359 9.9414 11.2356 9.99079 10.6975L13.8121 14.5195C13.9064 14.6106 14.0327 14.661 14.1638 14.66C14.2949 14.6589 14.4203 14.6064 14.513 14.5137C14.6058 14.421 14.6584 14.2957 14.6596 14.1646C14.6608 14.0335 14.6105 13.9071 14.5195 13.8128L2.18612 1.47945ZM10.6661 8.54478L14.0048 11.8835C14.3848 11.7008 14.6675 11.3181 14.6675 10.8315V5.16812C14.6675 4.22812 13.6115 3.67345 12.8375 4.20812L10.6661 5.70812V8.54478ZM5.45412 3.33278L9.99945 7.87812V5.49945C9.99945 5.21492 9.94341 4.93318 9.83452 4.6703C9.72564 4.40743 9.56604 4.16858 9.36485 3.96739C9.16366 3.76619 8.9248 3.6066 8.66193 3.49771C8.39906 3.38883 8.11732 3.33278 7.83278 3.33278H5.45412Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Record = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 18C13.5913 18 15.1174 17.3679 16.2426 16.2426C17.3679 15.1174 18 13.5913 18 12C18 10.4087 17.3679 8.88258 16.2426 7.75736C15.1174 6.63214 13.5913 6 12 6C10.4087 6 8.88258 6.63214 7.75736 7.75736C6.63214 8.88258 6 10.4087 6 12C6 13.5913 6.63214 15.1174 7.75736 16.2426C8.88258 17.3679 10.4087 18 12 18ZM22 12C22 14.6522 20.9464 17.1957 19.0711 19.0711C17.1957 20.9464 14.6522 22 12 22C9.34784 22 6.8043 20.9464 4.92893 19.0711C3.05357 17.1957 2 14.6522 2 12C2 9.34784 3.05357 6.8043 4.92893 4.92893C6.8043 3.05357 9.34784 2 12 2C14.6522 2 17.1957 3.05357 19.0711 4.92893C20.9464 6.8043 22 9.34784 22 12ZM20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const DashboardFill = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M10.9979 4.68V8.56C10.9979 8.88127 10.9344 9.19938 10.8112 9.49606C10.6879 9.79275 10.5073 10.0622 10.2797 10.2889C10.052 10.5156 9.78187 10.6951 9.48468 10.8171C9.18749 10.9392 8.86913 11.0013 8.54786 11H4.68786C4.36747 11.0019 4.04997 10.9392 3.75442 10.8155C3.45886 10.6917 3.19133 10.5096 2.96786 10.28C2.74098 10.055 2.56131 9.78697 2.43939 9.49161C2.31747 9.19625 2.25575 8.87952 2.25786 8.56V4.69C2.25786 4.0446 2.51356 3.42549 2.96899 2.96819C3.42441 2.51088 4.04247 2.25265 4.68786 2.25H8.55787C8.87793 2.25031 9.19475 2.3141 9.48999 2.43769C9.78523 2.56128 10.053 2.74221 10.2779 2.97C10.5054 3.19298 10.6862 3.45902 10.8098 3.75261C10.9334 4.04619 10.9973 4.36145 10.9979 4.68ZM21.7479 4.69V8.56C21.7427 9.2038 21.4853 9.81991 21.031 10.2761C20.5767 10.7323 19.9616 10.9922 19.3179 11H15.4379C14.7911 10.996 14.171 10.7416 13.7079 10.29C13.4816 10.0625 13.3024 9.79258 13.1806 9.49572C13.0587 9.19886 12.9966 8.88088 12.9979 8.56V4.69C12.9971 4.36977 13.0603 4.05261 13.184 3.75722C13.3077 3.46182 13.4892 3.19416 13.7179 2.97C13.9427 2.74221 14.2105 2.56128 14.5057 2.43769C14.801 2.3141 15.1178 2.25031 15.4379 2.25H19.3079C19.9534 2.25523 20.571 2.51398 21.0274 2.97044C21.4839 3.4269 21.7426 4.04449 21.7479 4.69ZM21.7479 15.44V19.31C21.7427 19.9538 21.4853 20.5699 21.031 21.0261C20.5767 21.4823 19.9616 21.7422 19.3179 21.75H15.4379C14.7869 21.7566 14.1591 21.5091 13.6879 21.06C13.4607 20.8331 13.2809 20.5634 13.159 20.2664C13.0371 19.9693 12.9755 19.651 12.9779 19.33V15.46C12.9771 15.1398 13.0403 14.8226 13.164 14.5272C13.2877 14.2318 13.4692 13.9642 13.6979 13.74C13.9227 13.5122 14.1905 13.3313 14.4857 13.2077C14.781 13.0841 15.0978 13.0203 15.4179 13.02H19.2879C19.9334 13.0252 20.551 13.284 21.0074 13.7404C21.4639 14.1969 21.7226 14.8145 21.7279 15.46L21.7479 15.44ZM10.9979 15.45V19.32C10.99 19.9655 10.7287 20.582 10.2704 21.0366C9.81205 21.4912 9.1934 21.7474 8.54786 21.75H4.68786C4.36838 21.7513 4.0518 21.6894 3.75638 21.5677C3.46096 21.4461 3.19256 21.2671 2.96665 21.0412C2.74074 20.8153 2.56179 20.5469 2.44014 20.2515C2.31849 19.9561 2.25654 19.6395 2.25786 19.32V15.45C2.26044 14.8045 2.51666 14.1858 2.97125 13.7275C3.42584 13.2691 4.04237 13.0079 4.68786 13H8.55787C9.20607 13.0066 9.82635 13.2648 10.2879 13.72C10.744 14.1801 10.9992 14.8021 10.9979 15.45Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Reply = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path d="M10 11h6v7h2v-8a1 1 0 0 0-1-1h-7V6l-5 4 5 4v-3z" fill="currentColor"></path>
    </svg>
  );
};
export const CaptionIcon = ({ className }: IconProps) => {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.17188 3.4987C1.17187 3.18928 1.29479 2.89253 1.51358 2.67374C1.73238 2.45495 2.02912 2.33203 2.33854 2.33203H11.6719C11.9813 2.33203 12.278 2.45495 12.4968 2.67374C12.7156 2.89253 12.8385 3.18928 12.8385 3.4987V10.4987C12.8385 10.8081 12.7156 11.1049 12.4968 11.3237C12.278 11.5424 11.9813 11.6654 11.6719 11.6654H2.33854C2.02912 11.6654 1.73238 11.5424 1.51358 11.3237C1.29479 11.1049 1.17188 10.8081 1.17188 10.4987V3.4987ZM5.23304 6.33136C5.36793 6.26092 5.51903 6.22738 5.67106 6.23414C5.82308 6.2409 5.97061 6.28772 6.09871 6.36986C6.16313 6.41138 6.2351 6.43981 6.31051 6.45351C6.38592 6.46722 6.46329 6.46594 6.53821 6.44974C6.61312 6.43354 6.68411 6.40275 6.74712 6.35912C6.81014 6.31549 6.86394 6.25987 6.90546 6.19545C6.94698 6.13102 6.9754 6.05905 6.98911 5.98364C7.00281 5.90823 7.00153 5.83086 6.98533 5.75595C6.96914 5.68104 6.93834 5.61005 6.89471 5.54703C6.85108 5.48402 6.79547 5.43022 6.73104 5.3887C6.42941 5.19439 6.08161 5.08363 5.72317 5.06772C5.36472 5.05182 5.00848 5.13133 4.69082 5.29815C4.37316 5.46497 4.10547 5.71312 3.91509 6.01724C3.72471 6.32136 3.61847 6.67057 3.60721 7.02919C3.59595 7.38781 3.68007 7.74299 3.85099 8.05846C4.02192 8.37393 4.27351 8.63839 4.58007 8.82481C4.88664 9.01123 5.23719 9.11294 5.59593 9.11955C5.95467 9.12617 6.30873 9.03744 6.62196 8.86245C6.68883 8.82506 6.74769 8.77488 6.79517 8.71475C6.84265 8.65462 6.87782 8.58572 6.89868 8.512C6.91953 8.43828 6.92566 8.36117 6.91671 8.28508C6.90777 8.20899 6.88392 8.13541 6.84654 8.06853C6.80916 8.00166 6.75897 7.9428 6.69884 7.89532C6.63871 7.84784 6.56982 7.81267 6.4961 7.79181C6.42237 7.77096 6.34527 7.76483 6.26918 7.77378C6.19309 7.78272 6.1195 7.80656 6.05263 7.84395C5.85204 7.95263 5.6165 7.97718 5.39782 7.9122C5.17914 7.84722 4.99523 7.69803 4.88654 7.49745C4.77786 7.29687 4.75331 7.06133 4.81829 6.84264C4.88327 6.62396 5.03246 6.44005 5.23304 6.33136ZM8.84154 6.33136C8.97643 6.26092 9.12753 6.22738 9.27956 6.23414C9.43158 6.2409 9.57911 6.28772 9.70721 6.36986C9.77163 6.41138 9.84361 6.43981 9.91901 6.45351C9.99442 6.46722 10.0718 6.46594 10.1467 6.44974C10.2216 6.43354 10.2926 6.40275 10.3556 6.35912C10.4186 6.31549 10.4724 6.25987 10.514 6.19545C10.5555 6.13102 10.5839 6.05905 10.5976 5.98364C10.6113 5.90823 10.61 5.83086 10.5938 5.75595C10.5776 5.68104 10.5468 5.61005 10.5032 5.54703C10.4596 5.48402 10.404 5.43022 10.3395 5.3887C10.0379 5.19439 9.69011 5.08363 9.33167 5.06772C8.97322 5.05182 8.61698 5.13133 8.29932 5.29815C7.98166 5.46497 7.71397 5.71312 7.52359 6.01724C7.33321 6.32136 7.22697 6.67057 7.21571 7.02919C7.20445 7.38781 7.28857 7.74299 7.45949 8.05846C7.63042 8.37393 7.88201 8.63839 8.18857 8.82481C8.49514 9.01123 8.84569 9.11294 9.20443 9.11955C9.56317 9.12617 9.91723 9.03744 10.2305 8.86245C10.2973 8.82506 10.3562 8.77488 10.4037 8.71475C10.4512 8.65462 10.4863 8.58572 10.5072 8.512C10.528 8.43828 10.5342 8.36117 10.5252 8.28508C10.5163 8.20899 10.4924 8.13541 10.455 8.06853C10.4177 8.00166 10.3675 7.9428 10.3073 7.89532C10.2472 7.84784 10.1783 7.81267 10.1046 7.79181C10.0309 7.77096 9.95377 7.76483 9.87768 7.77378C9.80159 7.78272 9.728 7.80656 9.66113 7.84395C9.46054 7.95263 9.225 7.97718 9.00632 7.9122C8.78764 7.84722 8.60373 7.69803 8.49504 7.49745C8.38636 7.29687 8.36181 7.06133 8.42679 6.84264C8.49177 6.62396 8.64096 6.44005 8.84154 6.33136Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const FileBold = ({ className }: IconProps) => {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.67188 12.8346H6.33854C4.13879 12.8346 3.03863 12.8346 2.35554 12.151C1.67246 11.4673 1.67188 10.3677 1.67188 8.16797V5.83464C1.67188 3.63489 1.67187 2.53472 2.35554 1.85164C3.03921 1.16855 4.14463 1.16797 6.35604 1.16797C6.70954 1.16797 6.99246 1.16797 7.23104 1.17789C7.22326 1.22455 7.21938 1.272 7.21938 1.32022L7.21354 2.97339C7.21354 3.6133 7.21354 4.17914 7.27479 4.63472C7.34129 5.1288 7.49354 5.62289 7.89721 6.02655C8.29971 6.42905 8.79438 6.58189 9.28846 6.64839C9.74404 6.70964 10.3099 6.70964 10.9498 6.70964H13.3135C13.3385 7.02114 13.3385 7.4038 13.3385 7.91305V8.16797C13.3385 10.3677 13.3385 11.4679 12.6549 12.151C11.9712 12.8341 10.8716 12.8346 8.67188 12.8346Z"
        fill="currentColor"
      />
      <path
        d="M11.7991 4.44173L9.48908 2.36331C8.83167 1.77123 8.50325 1.4749 8.099 1.32031L8.09375 2.91515C8.09375 4.29006 8.09375 4.97781 8.52075 5.40481C8.94775 5.83181 9.6355 5.83181 11.0104 5.83181H13.0988C12.8876 5.42115 12.5084 5.08048 11.7991 4.44173Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const FileEdit = ({ className }: IconProps) => {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" className={className}>
      <path
        d="M4.01042 1.16797C3.36875 1.16797 2.84375 1.69297 2.84375 2.33464V11.668C2.84375 12.3096 3.36875 12.8346 4.01042 12.8346H6.34375V11.7263L12.1771 5.89297V4.66797L8.67708 1.16797H4.01042ZM8.09375 2.04297L11.3021 5.2513H8.09375V2.04297ZM12.2354 7.58464C12.1771 7.58464 12.0604 7.64297 12.0021 7.7013L11.4187 8.28464L12.6437 9.50963L13.2271 8.9263C13.3437 8.80964 13.3437 8.5763 13.2271 8.45964L12.4688 7.7013C12.4104 7.64297 12.3521 7.58464 12.2354 7.58464ZM11.0688 8.63464L7.51042 12.193V13.418H8.73542L12.2937 9.85964L11.0688 8.63464Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Shield = ({ className }: IconProps) => {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" className={className}>
      <path
        d="M7.95729 1.45266C7.82421 1.36136 7.6666 1.3125 7.50521 1.3125C7.34382 1.3125 7.18621 1.36136 7.05313 1.45266L6.69729 1.69591C5.78908 2.31838 4.73942 2.70343 3.64413 2.81591C3.46272 2.83511 3.29486 2.92087 3.173 3.05662C3.05115 3.19238 2.98394 3.36849 2.98438 3.55091V6.42674C2.98438 7.909 3.76313 9.25766 4.61188 10.2942C5.46704 11.3402 6.44121 12.1271 6.93179 12.4952C7.0969 12.62 7.29823 12.6875 7.50521 12.6875C7.71219 12.6875 7.91352 12.62 8.07863 12.4952C8.56921 12.1277 9.54338 11.3402 10.3985 10.2948C11.2473 9.25766 12.026 7.90899 12.026 6.42733V3.55033C12.026 3.17699 11.7472 2.85383 11.3663 2.81533C10.271 2.70285 9.22134 2.3178 8.31313 1.69533L7.95729 1.45266Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Brightness = ({ className }: IconProps) => {
  return (
    <svg width="14" height="15" viewBox="0 0 14 15" fill="none" className={className}>
      <path
        d="M7.01302 11.3112C8.78519 11.3112 10.2214 9.87474 10.2214 8.10286C10.2214 6.33099 8.78519 4.89453 7.01302 4.89453C5.24085 4.89453 3.80469 6.3307 3.80469 8.10286C3.80469 9.87503 5.24115 11.3112 7.01302 11.3112Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M11.365 3.625L10.6475 4.34658M3.22956 11.7144L2.63281 12.3149M7.00169 13.0584V13.9334M12.835 7.80867H11.6684M10.9485 11.5951L11.6684 12.3149"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.01042 6.05859C6.7423 6.05859 6.47681 6.1114 6.2291 6.21401C5.9814 6.31661 5.75633 6.467 5.56674 6.65658C5.37715 6.84617 5.22677 7.07124 5.12416 7.31895C5.02156 7.56666 4.96875 7.83215 4.96875 8.10026C4.96875 8.36838 5.02156 8.63387 5.12416 8.88157C5.22677 9.12928 5.37715 9.35435 5.56674 9.54394C5.75633 9.73352 5.9814 9.88391 6.2291 9.98651C6.47681 10.0891 6.7423 10.1419 7.01042 10.1419"
        fill="currentColor"
      />
      <path
        d="M1.17188 8.10156H2.33854M2.93471 3.62623L3.5335 4.22502M7.00521 1.97656V3.14323"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const Help = ({ className }: IconProps) => {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M6.97604 10.5013C7.18021 10.5013 7.35288 10.4307 7.49404 10.2896C7.63521 10.1484 7.7056 9.97592 7.70521 9.77214C7.70482 9.56836 7.63443 9.39569 7.49404 9.25414C7.35365 9.11258 7.18099 9.04219 6.97604 9.04297C6.7711 9.04375 6.59863 9.11433 6.45863 9.25472C6.31863 9.39511 6.24804 9.56758 6.24688 9.77214C6.24571 9.97669 6.31629 10.1494 6.45863 10.2901C6.60096 10.4309 6.77343 10.5013 6.97604 10.5013ZM6.45104 8.25547H7.53021C7.53021 7.93464 7.56676 7.68186 7.63988 7.49714C7.71299 7.31242 7.91949 7.05964 8.25938 6.7388C8.51215 6.48603 8.71146 6.24531 8.85729 6.01664C9.00313 5.78797 9.07604 5.51342 9.07604 5.19297C9.07604 4.64853 8.87674 4.23047 8.47813 3.93881C8.07951 3.64714 7.60799 3.50131 7.06354 3.50131C6.50938 3.50131 6.05982 3.64714 5.71488 3.93881C5.36993 4.23047 5.12921 4.58047 4.99271 4.98881L5.95521 5.36797C6.00382 5.19297 6.11329 5.00339 6.28363 4.79922C6.45396 4.59506 6.71393 4.49297 7.06354 4.49297C7.37465 4.49297 7.60799 4.57814 7.76354 4.74847C7.9191 4.9188 7.99688 5.10586 7.99688 5.30964C7.99688 5.50408 7.93854 5.68647 7.82188 5.8568C7.70521 6.02714 7.55938 6.18503 7.38438 6.33047C6.9566 6.70964 6.6941 6.99644 6.59688 7.19089C6.49965 7.38533 6.45104 7.74019 6.45104 8.25547ZM7.00521 12.8346C6.19826 12.8346 5.43993 12.6816 4.73021 12.3756C4.02049 12.0695 3.40313 11.6538 2.87813 11.1284C2.35313 10.603 1.9376 9.98564 1.63154 9.2763C1.32549 8.56697 1.17226 7.80864 1.17188 7.0013C1.17149 6.19397 1.32471 5.43564 1.63154 4.72631C1.93838 4.01697 2.3539 3.39961 2.87813 2.87422C3.40235 2.34883 4.01971 1.93331 4.73021 1.62764C5.44071 1.32197 6.19904 1.16875 7.00521 1.16797C7.81138 1.16719 8.56971 1.32042 9.28021 1.62764C9.99071 1.93486 10.6081 2.35039 11.1323 2.87422C11.6565 3.39806 12.0722 4.01542 12.3795 4.72631C12.6867 5.43719 12.8397 6.19553 12.8385 7.0013C12.8374 7.80708 12.6842 8.56542 12.3789 9.2763C12.0736 9.98719 11.6581 10.6046 11.1323 11.1284C10.6065 11.6522 9.98915 12.0679 9.28021 12.3756C8.57126 12.6832 7.81293 12.8362 7.00521 12.8346Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const Wallet = ({ className }: IconProps) => {
  return (
    <svg className={className} viewBox="2 3 20 18">
      <path
        d="M20 7V5c0-1.103-.897-2-2-2H5C3.346 3 2 4.346 2 6v12c0 2.201 1.794 3 3 3h15c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2zm-2 9h-2v-4h2v4zM5 7a1.001 1.001 0 0 1 0-2h13v2H5z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const HashCircle = ({ className }: IconProps) => {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className={className}>
      <circle cx="14.9014" cy="15.0576" r="13.9639" fill="#E4F5F9" stroke="currentColor" />
      <path
        d="M10.5625 13.3086H19.2292M10.5625 16.8086H19.2292M13.8125 9.80859L12.7292 20.3086M17.0625 9.80859L15.9792 20.3086"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const MoveDown = ({ className }: IconProps) => {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" className={className}>
      <path
        d="M8.38281 18L12.3828 22M12.3828 22L16.3828 18M12.3828 22V2"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const Warning = ({ className }: IconProps) => {
  return (
    <svg viewBox="2 2.04 20 18.96" className={className}>
      <path
        fill="currentColor"
        d="M12.884 2.532c-.346-.654-1.422-.654-1.768 0l-9 17A.999.999 0 0 0 3 21h18a.998.998 0 0 0 .883-1.467L12.884 2.532zM13 18h-2v-2h2v2zm-2-4V9h2l.001 5H11z"
      ></path>
    </svg>
  );
};

// Line icons
export const HomeLine = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M6.66667 14.1667H13.3333M9.18141 2.30333L3.52949 6.69927C3.15168 6.99312 2.96278 7.14005 2.82669 7.32405C2.70614 7.48704 2.61633 7.67065 2.56169 7.86588C2.5 8.08627 2.5 8.32558 2.5 8.80421V14.8333C2.5 15.7667 2.5 16.2335 2.68166 16.59C2.84144 16.9036 3.09641 17.1585 3.41002 17.3183C3.76654 17.5 4.23325 17.5 5.16667 17.5H14.8333C15.7668 17.5 16.2335 17.5 16.59 17.3183C16.9036 17.1585 17.1586 16.9036 17.3183 16.59C17.5 16.2335 17.5 15.7667 17.5 14.8333V8.80421C17.5 8.32558 17.5 8.08627 17.4383 7.86588C17.3837 7.67065 17.2939 7.48704 17.1733 7.32405C17.0372 7.14005 16.8483 6.99312 16.4705 6.69927L10.8186 2.30333C10.5258 2.07562 10.3794 1.96177 10.2178 1.918C10.0752 1.87938 9.92484 1.87938 9.78221 1.918C9.62057 1.96177 9.47418 2.07562 9.18141 2.30333Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const UsersGroupLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1037_14891)">
        <ellipse
          cx="8.00004"
          cy="4.00016"
          rx="2.66667"
          ry="2.66667"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 5.99984C13.1046 5.99984 14 5.25365 14 4.33317C14 3.4127 13.1046 2.6665 12 2.6665"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M4 5.99984C2.89543 5.99984 2 5.25365 2 4.33317C2 3.4127 2.89543 2.6665 4 2.6665"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <ellipse cx="8" cy="11.3332" rx="4" ry="2.66667" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M13.3334 12.6668C14.5029 12.4104 15.3334 11.7609 15.3334 11.0002C15.3334 10.2395 14.5029 9.58996 13.3334 9.3335"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M2.66663 12.6668C1.49713 12.4104 0.666626 11.7609 0.666626 11.0002C0.666626 10.2395 1.49713 9.58996 2.66663 9.3335"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1037_14891">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const LetterLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6.6291 2.1665H9.37099C10.5962 2.16649 11.5666 2.16649 12.3261 2.26859C13.1077 2.37368 13.7403 2.59509 14.2392 3.094C14.7381 3.59291 14.9595 4.22554 15.0646 5.00716C15.1667 5.76663 15.1667 6.73706 15.1667 7.96223V8.03745C15.1667 9.26262 15.1667 10.233 15.0646 10.9925C14.9595 11.7741 14.7381 12.4068 14.2392 12.9057C13.7403 13.4046 13.1077 13.626 12.3261 13.7311C11.5666 13.8332 10.5962 13.8332 9.37098 13.8332H6.6291C5.40393 13.8332 4.4335 13.8332 3.67403 13.7311C2.89241 13.626 2.25978 13.4046 1.76087 12.9057C1.26196 12.4068 1.04055 11.7741 0.935464 10.9925C0.833355 10.233 0.833364 9.26262 0.833374 8.03745V7.96223C0.833364 6.73705 0.833355 5.76663 0.935464 5.00716C1.04055 4.22554 1.26196 3.59291 1.76087 3.094C2.25978 2.59509 2.89241 2.37368 3.67403 2.26859C4.4335 2.16649 5.40392 2.16649 6.6291 2.1665ZM3.80727 3.25968C3.13655 3.34985 2.75012 3.51897 2.46798 3.80111C2.18584 4.08325 2.01672 4.46968 1.92655 5.1404C1.83444 5.82551 1.83337 6.72862 1.83337 7.99984C1.83337 9.27105 1.83444 10.1742 1.92655 10.8593C2.01672 11.53 2.18584 11.9164 2.46798 12.1986C2.75012 12.4807 3.13655 12.6498 3.80727 12.74C4.49238 12.8321 5.39549 12.8332 6.66671 12.8332H9.33337C10.6046 12.8332 11.5077 12.8321 12.1928 12.74C12.8635 12.6498 13.25 12.4807 13.5321 12.1986C13.8142 11.9164 13.9834 11.53 14.0735 10.8593C14.1656 10.1742 14.1667 9.27105 14.1667 7.99984C14.1667 6.72862 14.1656 5.82551 14.0735 5.1404C13.9834 4.46968 13.8142 4.08325 13.5321 3.80111C13.25 3.51897 12.8635 3.34985 12.1928 3.25968C11.5077 3.16757 10.6046 3.1665 9.33337 3.1665H6.66671C5.39549 3.1665 4.49238 3.16757 3.80727 3.25968ZM3.61593 5.01308C3.79271 4.80094 4.10799 4.77228 4.32013 4.94906L5.7594 6.14845C6.38137 6.66676 6.81319 7.02545 7.17776 7.25992C7.53067 7.4869 7.76999 7.56309 8.00004 7.56309C8.23009 7.56309 8.46941 7.4869 8.82232 7.25992C9.18689 7.02545 9.61871 6.66676 10.2407 6.14845L11.6799 4.94906C11.8921 4.77228 12.2074 4.80094 12.3842 5.01308C12.5609 5.22522 12.5323 5.5405 12.3201 5.71728L10.8558 6.93755C10.2649 7.42999 9.78596 7.82912 9.36326 8.10099C8.92293 8.38419 8.49409 8.56309 8.00004 8.56309C7.50599 8.56309 7.07716 8.38419 6.63683 8.10099C6.21412 7.82912 5.73518 7.42999 5.14428 6.93756L3.67995 5.71728C3.46781 5.5405 3.43915 5.22522 3.61593 5.01308Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth=".5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const PenLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12.2973 2.18438C13.8211 0.660546 16.2917 0.660546 17.8156 2.18438C19.3394 3.70821 19.3394 6.17883 17.8156 7.70266L9.91114 15.6071C9.45954 16.0587 9.1937 16.3246 8.89796 16.5552C8.54937 16.8271 8.17221 17.0602 7.77313 17.2504C7.43455 17.4118 7.07787 17.5307 6.47194 17.7326L3.69601 18.6579L3.02761 18.8807C2.48547 19.0614 1.88777 18.9203 1.48368 18.5163C1.0796 18.1122 0.9385 17.5145 1.11921 16.9723L2.26731 13.528C2.46927 12.9221 2.58815 12.5654 2.74951 12.2268C2.9397 11.8277 3.17281 11.4506 3.44469 11.102C3.67537 10.8062 3.94124 10.5404 4.39289 10.0888L12.2973 2.18438ZM3.66717 17.3499L6.03511 16.5606C6.69437 16.3409 6.97447 16.2463 7.23536 16.122C7.55247 15.9709 7.85218 15.7857 8.12918 15.5696C8.35706 15.3919 8.56686 15.1836 9.05824 14.6922L15.3661 8.38431C14.7089 8.15251 13.8623 7.72286 13.0697 6.93026C12.2771 6.13766 11.8474 5.291 11.6156 4.63379L5.30773 10.9417C4.81634 11.4331 4.60807 11.6429 4.43033 11.8708C4.21428 12.1478 4.02905 12.4475 3.87792 12.7646C3.75359 13.0255 3.65908 13.3056 3.43933 13.9648L2.65002 16.3328L3.66717 17.3499ZM12.6295 3.61987C12.658 3.76567 12.7062 3.96387 12.7866 4.19557C12.9676 4.71719 13.3094 5.40224 13.9536 6.04638C14.5977 6.69051 15.2827 7.03237 15.8044 7.21334C16.0361 7.29372 16.2343 7.34189 16.3801 7.37039L16.9317 6.81877C17.9674 5.7831 17.9674 4.10394 16.9317 3.06826C15.896 2.03258 14.2168 2.03258 13.1812 3.06826L12.6295 3.61987Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const EditIcon = ({ className }: IconProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <g>
        <path
          d="M7.66212 14.4563C7.90076 14.2702 8.11722 14.0537 8.55008 13.6209L14.097 8.07399C13.342 7.75978 12.4479 7.24365 11.6022 6.39801C10.7565 5.55224 10.2403 4.65794 9.92612 3.90293L4.37912 9.44992L4.37907 9.44997C3.94624 9.8828 3.7298 10.0992 3.54367 10.3379C3.3241 10.6194 3.13585 10.924 2.98226 11.2463C2.85205 11.5195 2.75526 11.8099 2.56167 12.3906L1.54084 15.4531C1.44557 15.7389 1.51995 16.054 1.73297 16.267C1.94599 16.48 2.26108 16.5544 2.54688 16.4592L5.60938 15.4383C6.19014 15.2447 6.48052 15.1479 6.75373 15.0177C7.07602 14.8641 7.38061 14.6759 7.66212 14.4563Z"
          fill="currentColor"
        />
        <path
          d="M15.6362 6.53479C16.7879 5.38301 16.7879 3.51561 15.6362 2.36383C14.4844 1.21206 12.617 1.21206 11.4652 2.36383L10.7999 3.02911C10.809 3.05662 10.8185 3.08451 10.8283 3.11277C11.0721 3.81562 11.5322 4.737 12.3977 5.60252C13.2632 6.46803 14.1846 6.92811 14.8875 7.17196C14.9156 7.18172 14.9434 7.19113 14.9708 7.2002L15.6362 6.53479Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const PhoneCallingLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M11.25 1.66672C11.25 1.66672 13.1945 1.84349 15.6694 4.31837C18.1443 6.79324 18.3211 8.73778 18.3211 8.73778"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M11.8394 4.61304C11.8394 4.61304 12.6643 4.84874 13.9018 6.08618C15.1392 7.32361 15.3749 8.14857 15.3749 8.14857"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M12.5839 12.5227L12.0401 12.0062L12.0401 12.0062L12.5839 12.5227ZM12.9635 12.1231L13.5073 12.6396L13.5073 12.6396L12.9635 12.1231ZM14.9774 11.8436L14.6032 12.4936L14.6032 12.4936L14.9774 11.8436ZM16.5694 12.76L16.1953 13.41L16.5694 12.76ZM17.0181 15.632L17.5619 16.1485L17.5619 16.1485L17.0181 15.632ZM15.8343 16.8783L15.2905 16.3618L15.2905 16.3618L15.8343 16.8783ZM14.7302 17.4692L14.8039 18.2156L14.8039 18.2156L14.7302 17.4692ZM6.5128 13.7293L7.05659 13.2128L6.5128 13.7293ZM2.50241 5.80495L1.75348 5.84514L1.75348 5.84514L2.50241 5.80495ZM7.89793 7.08593L8.44173 7.60244L8.44173 7.60244L7.89793 7.08593ZM8.02853 4.74425L8.64093 4.31127L8.64093 4.31127L8.02853 4.74425ZM6.97771 3.25801L6.36532 3.691L6.36532 3.691L6.97771 3.25801ZM4.38454 3.0072L4.92834 3.52372L4.92834 3.52372L4.38454 3.0072ZM3.07654 4.38428L2.53275 3.86776L2.53275 3.86776L3.07654 4.38428ZM9.21927 10.8799L9.76306 10.3634L9.21927 10.8799ZM13.1277 13.0392L13.5073 12.6396L12.4197 11.6066L12.0401 12.0062L13.1277 13.0392ZM14.6032 12.4936L16.1953 13.41L16.9436 12.11L15.3515 11.1936L14.6032 12.4936ZM16.4743 15.1155L15.2905 16.3618L16.3781 17.3949L17.5619 16.1485L16.4743 15.1155ZM14.6566 16.7229C13.4931 16.8377 10.413 16.7464 7.05659 13.2128L5.96901 14.2458C9.69059 18.164 13.2516 18.3688 14.8039 18.2156L14.6566 16.7229ZM7.05659 13.2128C3.84791 9.83467 3.31734 6.99465 3.25133 5.76475L1.75348 5.84514C1.83772 7.41445 2.50328 10.5971 5.96901 14.2458L7.05659 13.2128ZM8.20271 7.85408L8.44173 7.60244L7.35414 6.56941L7.11513 6.82105L8.20271 7.85408ZM8.64093 4.31127L7.59011 2.82503L6.36532 3.691L7.41614 5.17723L8.64093 4.31127ZM3.84075 2.49069L2.53275 3.86776L3.62033 4.9008L4.92834 3.52372L3.84075 2.49069ZM7.65892 7.33756C7.11513 6.82105 7.11443 6.82178 7.11374 6.82251C7.1135 6.82276 7.11281 6.8235 7.11233 6.824C7.11139 6.82501 7.11043 6.82604 7.10945 6.82708C7.10751 6.82918 7.1055 6.83135 7.10345 6.83361C7.09934 6.83813 7.09501 6.84299 7.0905 6.84818C7.08147 6.85856 7.07167 6.8703 7.06128 6.88343C7.0405 6.90969 7.01733 6.94153 6.99323 6.9792C6.94488 7.05475 6.89328 7.15297 6.84984 7.27504C6.76135 7.5237 6.71527 7.84734 6.77358 8.24526C6.88784 9.02507 7.39437 10.0477 8.67547 11.3964L9.76306 10.3634C8.58166 9.1196 8.30802 8.37103 8.25773 8.0278C8.23376 7.8642 8.25931 7.78836 8.26303 7.77792C8.26569 7.77043 8.26533 7.77419 8.2567 7.78768C8.25246 7.79431 8.24627 7.80322 8.2375 7.8143C8.23311 7.81984 8.22808 7.82592 8.22231 7.83255C8.21943 7.83587 8.21636 7.83932 8.2131 7.84291C8.21147 7.8447 8.20979 7.84653 8.20806 7.84839C8.20719 7.84932 8.20632 7.85026 8.20542 7.85121C8.20498 7.85168 8.2043 7.8524 8.20408 7.85264C8.2034 7.85336 8.20271 7.85408 7.65892 7.33756ZM8.67547 11.3964C9.95208 12.7405 10.934 13.2886 11.7048 13.4138C12.1018 13.4783 12.4283 13.4274 12.6797 13.3283C12.8023 13.2799 12.9 13.2228 12.9742 13.1702C13.0113 13.1439 13.0424 13.1188 13.0678 13.0965C13.0805 13.0854 13.0918 13.0749 13.1018 13.0653C13.1068 13.0605 13.1114 13.0559 13.1157 13.0515C13.1179 13.0493 13.12 13.0472 13.122 13.0452C13.123 13.0441 13.124 13.0431 13.1249 13.0421C13.1254 13.0416 13.1261 13.0409 13.1263 13.0406C13.127 13.0399 13.1277 13.0392 12.5839 12.5227C12.0401 12.0062 12.0408 12.0054 12.0415 12.0047C12.0417 12.0045 12.0424 12.0038 12.0429 12.0033C12.0438 12.0024 12.0447 12.0014 12.0455 12.0005C12.0473 11.9987 12.0491 11.9969 12.0508 11.9952C12.0542 11.9917 12.0575 11.9884 12.0607 11.9854C12.0671 11.9792 12.0731 11.9737 12.0786 11.9689C12.0896 11.9592 12.0989 11.952 12.1065 11.9467C12.1217 11.9358 12.1297 11.9327 12.1293 11.9329C12.1293 11.9329 12.1173 11.9377 12.0904 11.9406C12.0635 11.9434 12.0162 11.9447 11.9453 11.9332C11.6494 11.8851 10.949 11.6119 9.76306 10.3634L8.67547 11.3964ZM7.59011 2.82503C6.70368 1.5713 4.92118 1.35319 3.84075 2.49069L4.92834 3.52372C5.30542 3.12672 5.98013 3.1462 6.36532 3.691L7.59011 2.82503ZM3.25133 5.76475C3.23577 5.47486 3.36121 5.1736 3.62033 4.9008L2.53275 3.86776C2.06917 4.35583 1.71032 5.04089 1.75348 5.84514L3.25133 5.76475ZM15.2905 16.3618C15.0716 16.5922 14.8544 16.7033 14.6566 16.7229L14.8039 18.2156C15.4651 18.1504 15.9949 17.7982 16.3781 17.3949L15.2905 16.3618ZM8.44173 7.60244C9.29154 6.70775 9.34892 5.31262 8.64093 4.31127L7.41614 5.17723C7.73555 5.62899 7.68191 6.22433 7.35414 6.56941L8.44173 7.60244ZM16.1953 13.41C16.8117 13.7648 16.9272 14.6386 16.4743 15.1155L17.5619 16.1485C18.707 14.9429 18.372 12.9322 16.9436 12.11L16.1953 13.41ZM13.5073 12.6396C13.7878 12.3443 14.2248 12.2758 14.6032 12.4936L15.3515 11.1936C14.3873 10.6386 13.1885 10.7971 12.4197 11.6066L13.5073 12.6396Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const ChatLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.71704 1.0415H11.2826C12.6188 1.0415 13.6663 1.04149 14.5031 1.12106C15.356 1.20216 16.0545 1.37031 16.6701 1.7476C17.3149 2.1427 17.857 2.68479 18.2521 3.32953C18.6294 3.94522 18.7975 4.64363 18.8786 5.49659C18.9582 6.33341 18.9582 7.38088 18.9582 8.71703V9.60638C18.9582 10.5574 18.9582 11.3031 18.9171 11.9055C18.8753 12.5184 18.7888 13.0285 18.5934 13.5002C18.1071 14.6743 17.1743 15.6071 16.0002 16.0934C15.3294 16.3713 14.5653 16.4329 13.5193 16.451C13.1533 16.4573 12.9216 16.4619 12.7449 16.4814C12.5798 16.4997 12.5158 16.5265 12.4784 16.5483C12.4389 16.5713 12.385 16.6132 12.2916 16.7414C12.1905 16.8801 12.0762 17.0719 11.895 17.378L11.4432 18.1413C10.7986 19.2304 9.20106 19.2304 8.55641 18.1413L8.10466 17.378C7.92346 17.0719 7.80918 16.8801 7.70805 16.7414C7.6146 16.6132 7.56078 16.5713 7.52127 16.5483C7.48382 16.5265 7.41983 16.4997 7.25474 16.4814C7.07806 16.4619 6.8463 16.4573 6.48039 16.451C5.43432 16.4329 4.67029 16.3713 3.99948 16.0934C2.82539 15.6071 1.89257 14.6743 1.40625 13.5002C1.21086 13.0285 1.12442 12.5184 1.0826 11.9055C1.0415 11.3031 1.0415 10.5574 1.0415 9.60637L1.0415 8.71704C1.0415 7.38089 1.04149 6.33342 1.12106 5.49659C1.20216 4.64363 1.37031 3.94522 1.7476 3.32953C2.1427 2.68479 2.68479 2.1427 3.32953 1.7476C3.94522 1.37031 4.64363 1.20216 5.49659 1.12106C6.33342 1.04149 7.38089 1.0415 8.71704 1.0415ZM5.61491 2.36545C4.85345 2.43785 4.36893 2.5767 3.98266 2.8134C3.5061 3.10543 3.10543 3.5061 2.8134 3.98266C2.5767 4.36893 2.43785 4.85345 2.36545 5.61491C2.29216 6.38567 2.2915 7.37381 2.2915 8.74984V9.58317C2.2915 10.5624 2.29184 11.2656 2.3297 11.8204C2.36718 12.3697 2.43932 12.7278 2.5611 13.0218C2.92056 13.8896 3.61003 14.5791 4.47783 14.9386C4.90753 15.1166 5.45572 15.1831 6.50192 15.2011L6.52844 15.2016C6.8601 15.2073 7.15074 15.2123 7.39231 15.239C7.65189 15.2678 7.90576 15.3259 8.14972 15.4678C8.39163 15.6085 8.56611 15.7964 8.71822 16.0051C8.85877 16.198 9.00321 16.442 9.16681 16.7185L9.6321 17.5046C9.79274 17.7759 10.2069 17.7759 10.3675 17.5046L10.8328 16.7185C10.9964 16.442 11.1409 16.198 11.2814 16.0051C11.4335 15.7964 11.608 15.6085 11.8499 15.4678C12.0939 15.3259 12.3478 15.2678 12.6073 15.239C12.8489 15.2123 13.1395 15.2073 13.4712 15.2016L13.4977 15.2011C14.5439 15.1831 15.0921 15.1166 15.5218 14.9386C16.3896 14.5791 17.0791 13.8896 17.4386 13.0218C17.5604 12.7278 17.6325 12.3697 17.67 11.8204C17.7078 11.2656 17.7082 10.5624 17.7082 9.58317V8.74984C17.7082 7.37381 17.7075 6.38567 17.6342 5.61491C17.5618 4.85345 17.423 4.36893 17.1863 3.98266C16.8942 3.5061 16.4936 3.10543 16.017 2.8134C15.6307 2.5767 15.1462 2.43785 14.3848 2.36545C13.614 2.29216 12.6259 2.2915 11.2498 2.2915H8.74984C7.37381 2.2915 6.38567 2.29216 5.61491 2.36545ZM6.0415 7.49984C6.0415 7.15466 6.32133 6.87484 6.6665 6.87484H13.3332C13.6783 6.87484 13.9582 7.15466 13.9582 7.49984C13.9582 7.84502 13.6783 8.12484 13.3332 8.12484H6.6665C6.32133 8.12484 6.0415 7.84502 6.0415 7.49984ZM6.0415 10.4165C6.0415 10.0713 6.32133 9.7915 6.6665 9.7915H11.2498C11.595 9.7915 11.8748 10.0713 11.8748 10.4165C11.8748 10.7617 11.595 11.0415 11.2498 11.0415H6.6665C6.32133 11.0415 6.0415 10.7617 6.0415 10.4165Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const DoubleChatLine = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path
        d="M5 18v3.766l1.515-.909L11.277 18H16c1.103 0 2-.897 2-2V8c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h1zM4 8h12v8h-5.277L7 18.234V16H4V8z"
        fill="currentColor"
      ></path>
      <path
        d="M20 2H8c-1.103 0-2 .897-2 2h12c1.103 0 2 .897 2 2v8c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const VideoCameraLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M1.6665 9.5835C1.6665 6.84393 1.6665 5.47414 2.42314 4.55219C2.56165 4.3834 2.71641 4.22864 2.88519 4.09013C3.80715 3.3335 5.17694 3.3335 7.9165 3.3335C10.6561 3.3335 12.0259 3.3335 12.9478 4.09013C13.1166 4.22864 13.2714 4.3834 13.4099 4.55219C14.1665 5.47414 14.1665 6.84393 14.1665 9.5835V10.4168C14.1665 13.1564 14.1665 14.5262 13.4099 15.4481C13.2714 15.6169 13.1166 15.7717 12.9478 15.9102C12.0259 16.6668 10.6561 16.6668 7.9165 16.6668C5.17694 16.6668 3.80715 16.6668 2.88519 15.9102C2.71641 15.7717 2.56165 15.6169 2.42314 15.4481C1.6665 14.5262 1.6665 13.1564 1.6665 10.4168V9.5835Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M14.1665 7.91666L14.7151 7.64235C16.3367 6.83156 17.1475 6.42617 17.7403 6.79256C18.3332 7.15895 18.3332 8.06544 18.3332 9.87842V10.1216C18.3332 11.9346 18.3332 12.841 17.7403 13.2074C17.1475 13.5738 16.3367 13.1684 14.7151 12.3576L14.1665 12.0833V7.91666Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const PrinterMinimalisticLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.95411 1.0415H10.0456C11.1852 1.04149 12.1038 1.04147 12.8263 1.13861C13.5764 1.23945 14.2079 1.4552 14.7095 1.9568C15.3262 2.57345 15.5169 3.39581 15.5842 4.41603C15.7884 4.42966 15.9801 4.4478 16.1596 4.47194C16.9097 4.57279 17.5413 4.78853 18.0429 5.29013C18.5445 5.79173 18.7602 6.42329 18.8611 7.17338C18.9582 7.89585 18.9582 8.81445 18.9582 9.95411V10.0456C18.9582 11.1852 18.9582 12.1038 18.8611 12.8263C18.7602 13.5764 18.5445 14.2079 18.0429 14.7095C17.4262 15.3262 16.6039 15.5169 15.5837 15.5842C15.57 15.7884 15.5519 15.9801 15.5277 16.1596C15.4269 16.9097 15.2111 17.5413 14.7095 18.0429C14.2079 18.5445 13.5764 18.7602 12.8263 18.8611C12.1038 18.9582 11.1852 18.9582 10.0456 18.9582H9.95411C8.81445 18.9582 7.89585 18.9582 7.17338 18.8611C6.42329 18.7602 5.79173 18.5445 5.29013 18.0429C4.78853 17.5413 4.57279 16.9097 4.47194 16.1596C4.4478 15.9801 4.42966 15.7884 4.41602 15.5842C3.39581 15.5169 2.57345 15.3262 1.9568 14.7095C1.4552 14.208 1.23945 13.5764 1.13861 12.8263C1.04147 12.1038 1.04149 11.1852 1.0415 10.0456V9.95411C1.04149 8.81445 1.04147 7.89585 1.13861 7.17338C1.23945 6.42329 1.4552 5.79173 1.9568 5.29013C2.45839 4.78853 3.08996 4.57279 3.84005 4.47194C4.01962 4.4478 4.21131 4.42966 4.4155 4.41603C4.48277 3.39581 4.67348 2.57345 5.29013 1.9568C5.79172 1.4552 6.42329 1.23945 7.17338 1.13861C7.89585 1.04147 8.81445 1.04149 9.95411 1.0415ZM5.67246 4.37729C5.96988 4.37483 6.28578 4.37483 6.62077 4.37484H13.3789C13.7139 4.37483 14.0298 4.37483 14.3272 4.37729C14.2589 3.52658 14.1053 3.12027 13.8257 2.84068C13.595 2.61004 13.2712 2.45967 12.6597 2.37746C12.0303 2.29283 11.196 2.2915 9.99984 2.2915C8.80366 2.2915 7.9694 2.29283 7.33994 2.37746C6.72846 2.45967 6.40465 2.61004 6.17401 2.84068C5.89442 3.12027 5.74074 3.52658 5.67246 4.37729ZM4.37729 14.3272C4.37483 14.0298 4.37483 13.7139 4.37484 13.3789L4.37484 10.7818C4.246 10.834 4.12303 10.8866 4.00584 10.9393C3.69094 11.0806 3.32106 10.94 3.17967 10.6251C3.03829 10.3102 3.17895 9.9403 3.49384 9.79892C4.92863 9.15471 7.06692 8.54151 9.99984 8.54151C12.9328 8.54151 15.071 9.15471 16.5058 9.79892C16.8207 9.9403 16.9614 10.3102 16.82 10.6251C16.6786 10.94 16.3087 11.0806 15.9938 10.9393C15.8767 10.8866 15.7537 10.834 15.6248 10.7818V13.3789C15.6248 13.7139 15.6248 14.0298 15.6224 14.3272C16.4731 14.2589 16.8794 14.1053 17.159 13.8257C17.3896 13.595 17.54 13.2712 17.6222 12.6597C17.7068 12.0303 17.7082 11.196 17.7082 9.99984C17.7082 8.80366 17.7068 7.9694 17.6222 7.33994C17.54 6.72846 17.3896 6.40465 17.159 6.17401C16.9284 5.94338 16.6046 5.79301 15.9931 5.71079C15.3636 5.62617 14.5294 5.62484 13.3332 5.62484H6.6665C5.47032 5.62484 4.63606 5.62617 4.00661 5.71079C3.39513 5.79301 3.07132 5.94338 2.84068 6.17401C2.61004 6.40465 2.45967 6.72846 2.37746 7.33994C2.29283 7.9694 2.2915 8.80366 2.2915 9.99984C2.2915 11.196 2.29283 12.0303 2.37746 12.6597C2.45967 13.2712 2.61004 13.595 2.84068 13.8257C3.12027 14.1053 3.52658 14.2589 4.37729 14.3272ZM14.3748 10.3555C13.2274 10.0312 11.7782 9.79151 9.99984 9.79151C8.22147 9.79151 6.77228 10.0312 5.62484 10.3555V13.3332C5.62484 14.5294 5.62616 15.3636 5.71079 15.9931C5.793 16.6046 5.94338 16.9284 6.17401 17.159C6.40465 17.3896 6.72846 17.54 7.33994 17.6222C7.9694 17.7068 8.80366 17.7082 9.99984 17.7082C11.196 17.7082 12.0303 17.7068 12.6597 17.6222C13.2712 17.54 13.595 17.3896 13.8257 17.159C14.0563 16.9284 14.2067 16.6046 14.2889 15.9931C14.3735 15.3636 14.3748 14.5294 14.3748 13.3332V10.3555Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const SearchLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M17.5 17.5L14.5834 14.5833M16.6667 9.58333C16.6667 13.4954 13.4954 16.6667 9.58333 16.6667C5.67132 16.6667 2.5 13.4954 2.5 9.58333C2.5 5.67132 5.67132 2.5 9.58333 2.5C13.4954 2.5 16.6667 5.67132 16.6667 9.58333Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const UserPlusLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.83338 4.00016C4.83338 2.25126 6.25115 0.833496 8.00005 0.833496C9.74895 0.833496 11.1667 2.25126 11.1667 4.00016C11.1667 5.74906 9.74895 7.16683 8.00005 7.16683C6.25115 7.16683 4.83338 5.74906 4.83338 4.00016ZM8.00005 1.8335C6.80343 1.8335 5.83338 2.80355 5.83338 4.00016C5.83338 5.19678 6.80343 6.16683 8.00005 6.16683C9.19667 6.16683 10.1667 5.19678 10.1667 4.00016C10.1667 2.80355 9.19667 1.8335 8.00005 1.8335Z"
          fill="currentColor"
        />
        <path
          d="M12 9.27793C12.2762 9.27793 12.5 9.50179 12.5 9.77793V10.1668H12.8888C13.165 10.1668 13.3888 10.3907 13.3888 10.6668C13.3888 10.943 13.165 11.1668 12.8888 11.1668H12.5V11.5557C12.5 11.8319 12.2762 12.0557 12 12.0557C11.7239 12.0557 11.5 11.8319 11.5 11.5557V11.1668H11.1111C10.8349 11.1668 10.6111 10.943 10.6111 10.6668C10.6111 10.3907 10.8349 10.1668 11.1111 10.1668H11.5V9.77793C11.5 9.50179 11.7239 9.27793 12 9.27793Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.84981 8.3421C9.268 8.2282 8.64569 8.16683 8.00005 8.16683C6.45768 8.16683 5.03667 8.51742 3.98368 9.10972C2.94637 9.69321 2.16672 10.5775 2.16672 11.6668L2.16667 11.7348C2.16592 12.5094 2.16497 13.4815 3.01766 14.1759C3.4373 14.5176 4.02437 14.7606 4.81752 14.9211C5.61289 15.0821 6.64953 15.1668 8.00005 15.1668C9.91211 15.1668 11.2067 14.9976 12.0798 14.6725C12.8657 14.3799 13.3316 13.9512 13.5803 13.4116C14.5285 12.8646 15.1667 11.8402 15.1667 10.6668C15.1667 8.91793 13.749 7.50016 12 7.50016C11.17 7.50016 10.4145 7.81953 9.84981 8.3421ZM4.47394 9.9813C3.58097 10.4836 3.16672 11.0993 3.16672 11.6668C3.16672 12.5387 3.19359 13.0295 3.64911 13.4004C3.89613 13.6016 4.30906 13.7979 5.01591 13.941C5.72054 14.0836 6.6839 14.1668 8.00005 14.1668C9.7187 14.1668 10.8268 14.0246 11.5406 13.8004C10.0094 13.5779 8.83338 12.2597 8.83338 10.6668C8.83338 10.1549 8.95485 9.6714 9.17052 9.24349C8.79602 9.19348 8.40408 9.16683 8.00005 9.16683C6.5969 9.16683 5.35125 9.48781 4.47394 9.9813ZM9.83338 10.6668C9.83338 9.47021 10.8034 8.50016 12 8.50016C13.1967 8.50016 14.1667 9.47021 14.1667 10.6668C14.1667 11.8634 13.1967 12.8335 12 12.8335C10.8034 12.8335 9.83338 11.8634 9.83338 10.6668Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4.83338 4.00016C4.83338 2.25126 6.25115 0.833496 8.00005 0.833496C9.74895 0.833496 11.1667 2.25126 11.1667 4.00016C11.1667 5.74906 9.74895 7.16683 8.00005 7.16683C6.25115 7.16683 4.83338 5.74906 4.83338 4.00016ZM8.00005 1.8335C6.80343 1.8335 5.83338 2.80355 5.83338 4.00016C5.83338 5.19678 6.80343 6.16683 8.00005 6.16683C9.19667 6.16683 10.1667 5.19678 10.1667 4.00016C10.1667 2.80355 9.19667 1.8335 8.00005 1.8335Z"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 9.27793C12.2762 9.27793 12.5 9.50179 12.5 9.77793V10.1668H12.8888C13.165 10.1668 13.3888 10.3907 13.3888 10.6668C13.3888 10.943 13.165 11.1668 12.8888 11.1668H12.5V11.5557C12.5 11.8319 12.2762 12.0557 12 12.0557C11.7239 12.0557 11.5 11.8319 11.5 11.5557V11.1668H11.1111C10.8349 11.1668 10.6111 10.943 10.6111 10.6668C10.6111 10.3907 10.8349 10.1668 11.1111 10.1668H11.5V9.77793C11.5 9.50179 11.7239 9.27793 12 9.27793Z"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.84981 8.3421C9.268 8.2282 8.64569 8.16683 8.00005 8.16683C6.45768 8.16683 5.03667 8.51742 3.98368 9.10972C2.94637 9.69321 2.16672 10.5775 2.16672 11.6668L2.16667 11.7348C2.16592 12.5094 2.16497 13.4815 3.01766 14.1759C3.4373 14.5176 4.02437 14.7606 4.81752 14.9211C5.61289 15.0821 6.64953 15.1668 8.00005 15.1668C9.91211 15.1668 11.2067 14.9976 12.0798 14.6725C12.8657 14.3799 13.3316 13.9512 13.5803 13.4116C14.5285 12.8646 15.1667 11.8402 15.1667 10.6668C15.1667 8.91793 13.749 7.50016 12 7.50016C11.17 7.50016 10.4145 7.81953 9.84981 8.3421ZM4.47394 9.9813C3.58097 10.4836 3.16672 11.0993 3.16672 11.6668C3.16672 12.5387 3.19359 13.0295 3.64911 13.4004C3.89613 13.6016 4.30906 13.7979 5.01591 13.941C5.72054 14.0836 6.6839 14.1668 8.00005 14.1668C9.7187 14.1668 10.8268 14.0246 11.5406 13.8004C10.0094 13.5779 8.83338 12.2597 8.83338 10.6668C8.83338 10.1549 8.95485 9.6714 9.17052 9.24349C8.79602 9.19348 8.40408 9.16683 8.00005 9.16683C6.5969 9.16683 5.35125 9.48781 4.47394 9.9813ZM9.83338 10.6668C9.83338 9.47021 10.8034 8.50016 12 8.50016C13.1967 8.50016 14.1667 9.47021 14.1667 10.6668C14.1667 11.8634 13.1967 12.8335 12 12.8335C10.8034 12.8335 9.83338 11.8634 9.83338 10.6668Z"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
export const WindowFrameLine = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g>
        <g clipPath="url(#clip0_673_16608)">
          <path
            d="M1.33337 8.00016C1.33337 4.85747 1.33337 3.28612 2.30968 2.30981C3.286 1.3335 4.85734 1.3335 8.00004 1.3335C11.1427 1.3335 12.7141 1.3335 13.6904 2.30981C14.6667 3.28612 14.6667 4.85747 14.6667 8.00016C14.6667 11.1429 14.6667 12.7142 13.6904 13.6905C12.7141 14.6668 11.1427 14.6668 8.00004 14.6668C4.85734 14.6668 3.286 14.6668 2.30968 13.6905C1.33337 12.7142 1.33337 11.1429 1.33337 8.00016Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M4.66671 4.00016C4.66671 4.36835 4.36823 4.66683 4.00004 4.66683C3.63185 4.66683 3.33337 4.36835 3.33337 4.00016C3.33337 3.63197 3.63185 3.3335 4.00004 3.3335C4.36823 3.3335 4.66671 3.63197 4.66671 4.00016Z"
            fill="currentColor"
          />
          <path
            d="M6.66671 4.00016C6.66671 4.36835 6.36823 4.66683 6.00004 4.66683C5.63185 4.66683 5.33337 4.36835 5.33337 4.00016C5.33337 3.63197 5.63185 3.3335 6.00004 3.3335C6.36823 3.3335 6.66671 3.63197 6.66671 4.00016Z"
            fill="currentColor"
          />
          <path
            d="M8.66671 4.00016C8.66671 4.36835 8.36823 4.66683 8.00004 4.66683C7.63185 4.66683 7.33337 4.36835 7.33337 4.00016C7.33337 3.63197 7.63185 3.3335 8.00004 3.3335C8.36823 3.3335 8.66671 3.63197 8.66671 4.00016Z"
            fill="currentColor"
          />
          <path
            d="M1.33337 6.3335H14.6667"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M6 14L6 6.66667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_673_16608">
          <rect width="16" height="16" rx="5" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const LinkLine = ({ className = '' }: IconProps) => {
  return (
    <svg width={'12'} height={'12'} viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1037_14908)">
        <path
          d="M10.4856 2.58939C11.4418 1.62946 12.8405 1.6093 13.6148 2.38662C14.3906 3.1654 14.3697 4.57289 13.4128 5.53348L11.7969 7.15564C11.602 7.35128 11.6027 7.66786 11.7983 7.86274C11.9939 8.05763 12.3105 8.05701 12.5054 7.86137L14.1213 6.23921C15.3955 4.96007 15.5555 2.91785 14.3233 1.68088C13.0896 0.442449 11.0519 0.603857 9.7771 1.88366L6.54533 5.12796C5.27113 6.4071 5.11116 8.44934 6.34334 9.68631C6.53822 9.88195 6.8548 9.88256 7.05044 9.68768C7.24608 9.4928 7.2467 9.17621 7.05181 8.98057C6.27604 8.20179 6.29694 6.79428 7.2538 5.8337L10.4856 2.58939Z"
          fill="currentColor"
        />
        <path
          d="M9.65661 6.31391C9.46172 6.11827 9.14514 6.11765 8.9495 6.31254C8.75386 6.50742 8.75325 6.824 8.94813 7.01964C9.72391 7.79843 9.70302 9.20591 8.74615 10.1665L5.5144 13.4108C4.55818 14.3708 3.15946 14.3909 2.38515 13.6136C1.60937 12.8348 1.63027 11.4273 2.58714 10.4667L4.20303 8.84454C4.39792 8.6489 4.3973 8.33232 4.20166 8.13743C4.00602 7.94255 3.68944 7.94316 3.49456 8.1388L1.87866 9.76097C0.604462 11.0401 0.444489 13.0824 1.67667 14.3193C2.91032 15.5578 4.94802 15.3964 6.22287 14.1166L9.45462 10.8722C10.7288 9.59308 10.8888 7.55088 9.65661 6.31391Z"
          fill="currentColor"
        />
        <path
          d="M10.4856 2.58939C11.4418 1.62946 12.8405 1.6093 13.6148 2.38662C14.3906 3.1654 14.3697 4.57289 13.4128 5.53348L11.7969 7.15564C11.602 7.35128 11.6027 7.66786 11.7983 7.86274C11.9939 8.05763 12.3105 8.05701 12.5054 7.86137L14.1213 6.23921C15.3955 4.96007 15.5555 2.91785 14.3233 1.68088C13.0896 0.442449 11.0519 0.603857 9.7771 1.88366L6.54533 5.12796C5.27113 6.4071 5.11116 8.44934 6.34334 9.68631C6.53822 9.88195 6.8548 9.88256 7.05044 9.68768C7.24608 9.4928 7.2467 9.17621 7.05181 8.98057C6.27604 8.20179 6.29694 6.79428 7.2538 5.8337L10.4856 2.58939ZM10.4856 2.58939L10.1313 2.23652M8.74615 10.1665C9.70302 9.20591 9.72391 7.79843 8.94813 7.01964C8.75325 6.824 8.75386 6.50742 8.9495 6.31254C9.14514 6.11765 9.46172 6.11827 9.65661 6.31391C10.8888 7.55088 10.7288 9.59308 9.45462 10.8722L6.22287 14.1166M8.74615 10.1665L9.10038 10.5194M8.74615 10.1665L5.5144 13.4108C4.55818 14.3708 3.15946 14.3909 2.38515 13.6136C1.60937 12.8348 1.63027 11.4273 2.58714 10.4667L4.20303 8.84454C4.39792 8.6489 4.3973 8.33232 4.20166 8.13743C4.00602 7.94255 3.68944 7.94316 3.49456 8.1388L1.87866 9.76097C0.604462 11.0401 0.444489 13.0824 1.67667 14.3193C2.91032 15.5578 4.94802 15.3964 6.22287 14.1166M6.22287 14.1166L5.89399 13.7889"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1037_14908">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const LetterOpenedLine = ({ className = '' }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1115_22771)">
        <path
          d="M12.0026 4.06641C12.8693 4.15166 13.4528 4.34434 13.8882 4.77979C14.6693 5.56084 14.6693 6.81792 14.6693 9.33208C14.6693 11.8462 14.6693 13.1033 13.8882 13.8844C13.1072 14.6654 11.8501 14.6654 9.33594 14.6654H6.66927C4.15511 14.6654 2.89803 14.6654 2.11699 13.8844C1.33594 13.1033 1.33594 11.8462 1.33594 9.33208C1.33594 6.81792 1.33594 5.56084 2.11699 4.77979C2.55244 4.34434 3.13586 4.15166 4.00261 4.06641"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6.66406 4H9.33073"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M7.33594 6H8.66927"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M8 9.39528C7.2759 9.39528 6.66369 8.8851 5.43926 7.86475C4.73152 7.27496 4.37764 6.98007 4.18882 6.57693C4 6.17378 4 5.71314 4 4.79186V4.66536C4 3.09402 4 2.30834 4.48816 1.82019C4.97631 1.33203 5.76198 1.33203 7.33333 1.33203H8.66667C10.238 1.33203 11.0237 1.33203 11.5118 1.82019C12 2.30834 12 3.09402 12 4.66536V4.79187C12 5.71314 12 6.17378 11.8112 6.57693C11.6224 6.98007 11.2685 7.27496 10.5607 7.86475L10.5607 7.86475C9.33631 8.88511 8.7241 9.39528 8 9.39528Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M4 6.66797L5.43926 7.86736C6.66369 8.88771 7.2759 9.39789 8 9.39789C8.7241 9.39789 9.33631 8.88771 10.5607 7.86735L12 6.66797"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1115_22771">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const UserLine = ({ className = '' }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <ellipse
          cx="8.0026"
          cy="3.9987"
          rx="2.66667"
          ry="2.66667"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M13.3307 11.668C13.3307 13.3248 13.3307 14.668 7.9974 14.668C2.66406 14.668 2.66406 13.3248 2.66406 11.668C2.66406 10.0111 5.05188 8.66797 7.9974 8.66797C10.9429 8.66797 13.3307 10.0111 13.3307 11.668Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const BellOffLine = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M9.33333 13.9987H6.66667M5.75537 2.02117C6.41306 1.5753 7.19399 1.33203 8 1.33203C9.06086 1.33203 10.0783 1.75346 10.8284 2.5036C11.5786 3.25375 12 4.27117 12 5.33203C12 6.73255 12.1801 7.83284 12.4323 8.68697M4.17245 4.17019C4.05911 4.54354 4 4.93474 4 5.33203C4 7.39215 3.48031 8.80267 2.89978 9.73564C2.41008 10.5226 2.16524 10.9161 2.17422 11.0259C2.18416 11.1474 2.20991 11.1938 2.30785 11.2664C2.39631 11.332 2.79506 11.332 3.59257 11.332H11.3333M14 13.9987L2 1.9987"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const Bell = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M12.4994 6.47174V6.00201C12.4994 3.42285 10.485 1.33203 8 1.33203C5.51504 1.33203 3.50058 3.42285 3.50058 6.00201V6.47174C3.50058 7.03547 3.33981 7.58658 3.03853 8.05563L2.30024 9.20505C1.62588 10.2549 2.1407 11.682 3.31357 12.014C6.38183 12.8825 9.61817 12.8825 12.6864 12.014C13.8593 11.682 14.3741 10.2549 13.6998 9.20505L12.9615 8.05563C12.6602 7.58658 12.4994 7.03547 12.4994 6.47174Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M5 12.668C5.43668 13.8332 6.61497 14.668 8 14.668C9.38503 14.668 10.5633 13.8332 11 12.668"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const SettingsLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <g clipPath="url(#clip0_1115_20874)">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9.17332 1.43353C8.92829 1.33203 8.61767 1.33203 7.99641 1.33203C7.37516 1.33203 7.06453 1.33203 6.8195 1.43353C6.4928 1.56885 6.23323 1.82842 6.09791 2.15512C6.03613 2.30426 6.01196 2.4777 6.00249 2.73069C5.98859 3.10248 5.79792 3.44663 5.47571 3.63265C5.15351 3.81867 4.76015 3.81172 4.43122 3.63787C4.20738 3.51956 4.04509 3.45378 3.88504 3.43271C3.53445 3.38655 3.17987 3.48156 2.89933 3.69683C2.68892 3.85828 2.5336 4.1273 2.22297 4.66532C1.91235 5.20334 1.75703 5.47235 1.72241 5.7353C1.67626 6.0859 1.77127 6.44047 1.98654 6.72102C2.08479 6.84907 2.22289 6.95672 2.43721 7.09138C2.75228 7.28935 2.95501 7.6266 2.95499 7.99871C2.95497 8.37078 2.75225 8.70798 2.43721 8.90593C2.22285 9.04061 2.08474 9.14827 1.98647 9.27633C1.7712 9.55688 1.67619 9.91145 1.72235 10.262C1.75697 10.525 1.91228 10.794 2.22291 11.332C2.53354 11.8701 2.68885 12.1391 2.89926 12.3005C3.17981 12.5158 3.53438 12.6108 3.88498 12.5646C4.04502 12.5436 4.2073 12.4778 4.43111 12.3595C4.76007 12.1856 5.15346 12.1787 5.47568 12.3647C5.79791 12.5508 5.98859 12.8949 6.0025 13.2667C6.01196 13.5197 6.03613 13.6931 6.09791 13.8423C6.23323 14.169 6.4928 14.4285 6.8195 14.5639C7.06453 14.6654 7.37516 14.6654 7.99641 14.6654C8.61767 14.6654 8.92829 14.6654 9.17332 14.5639C9.50003 14.4285 9.75959 14.169 9.89492 13.8423C9.95669 13.6931 9.98087 13.5197 9.99033 13.2667C10.0042 12.8949 10.1949 12.5508 10.5171 12.3647C10.8393 12.1787 11.2327 12.1856 11.5617 12.3595C11.7855 12.4778 11.9477 12.5435 12.1078 12.5646C12.4584 12.6108 12.8129 12.5157 13.0935 12.3005C13.3039 12.139 13.4592 11.87 13.7698 11.332C14.0805 10.794 14.2358 10.525 14.2704 10.262C14.3166 9.91141 14.2216 9.55683 14.0063 9.27629C13.908 9.14823 13.7699 9.04058 13.5556 8.9059C13.2405 8.70794 13.0378 8.37072 13.0378 7.99864C13.0379 7.6266 13.2406 7.28942 13.5556 7.09149C13.77 6.9568 13.9081 6.84914 14.0064 6.72106C14.2216 6.44052 14.3166 6.08594 14.2705 5.73535C14.2359 5.4724 14.0805 5.20339 13.7699 4.66537C13.4593 4.12734 13.304 3.85833 13.0936 3.69688C12.813 3.48161 12.4584 3.3866 12.1078 3.43275C11.9478 3.45382 11.7855 3.5196 11.5617 3.6379C11.2328 3.81176 10.8394 3.81871 10.5171 3.63267C10.1949 3.44663 10.0042 3.10247 9.99033 2.73066C9.98086 2.47768 9.95669 2.30425 9.89492 2.15512C9.75959 1.82842 9.50003 1.56885 9.17332 1.43353Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_1115_20874">
          <rect width="16" height="16" rx="5" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const StarCircleLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1115_19004)">
        <circle cx="8.0026" cy="7.9987" r="6.66667" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7.04845 5.46816C7.47067 4.71074 7.68177 4.33203 7.9974 4.33203C8.31302 4.33203 8.52412 4.71074 8.94634 5.46816L9.05557 5.66411C9.17555 5.87934 9.23554 5.98696 9.32908 6.05797C9.42262 6.12897 9.53911 6.15533 9.7721 6.20805L9.98422 6.25604C10.8041 6.44155 11.2141 6.5343 11.3116 6.84794C11.4091 7.16158 11.1296 7.48839 10.5707 8.14201L10.4261 8.3111C10.2673 8.49684 10.1878 8.58971 10.1521 8.7046C10.1164 8.81949 10.1284 8.9434 10.1524 9.19122L10.1743 9.41683C10.2588 10.2889 10.301 10.7249 10.0457 10.9188C9.79034 11.1126 9.4065 10.9359 8.63884 10.5824L8.44023 10.491C8.22209 10.3905 8.11301 10.3403 7.9974 10.3403C7.88178 10.3403 7.7727 10.3905 7.55456 10.491L7.35595 10.5824C6.58829 10.9359 6.20445 11.1126 5.94911 10.9188C5.69377 10.7249 5.73602 10.2889 5.82053 9.41683L5.84239 9.19122C5.8664 8.9434 5.87841 8.81949 5.84268 8.7046C5.80696 8.58971 5.72754 8.49684 5.5687 8.31111L5.42409 8.14201C4.86515 7.48839 4.58567 7.16158 4.6832 6.84794C4.78073 6.5343 5.19068 6.44155 6.01057 6.25604L6.22269 6.20805C6.45568 6.15533 6.57217 6.12897 6.66571 6.05797C6.75925 5.98696 6.81924 5.87934 6.93922 5.66411L7.04845 5.46816Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
      <defs>
        <clipPath id="clip0_1115_19004">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const MoveToFolderLine = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <g clipPath="url(#clip0_673_7045)">
        <path
          d="M1.33594 7.9987V4.63186C1.33594 4.04351 1.33594 3.74933 1.38217 3.50429C1.5857 2.42557 2.42948 1.58179 3.50819 1.37826C3.75324 1.33203 4.04742 1.33203 4.63577 1.33203C4.89355 1.33203 5.02245 1.33203 5.14632 1.34361C5.68037 1.39356 6.18695 1.60339 6.5999 1.94571C6.69568 2.02511 6.78682 2.11625 6.9691 2.29853L7.33594 2.66537C7.87979 3.20922 8.15172 3.48114 8.47735 3.66231C8.65623 3.76184 8.84598 3.84043 9.04284 3.89655C9.4012 3.9987 9.78576 3.9987 10.5549 3.9987H10.804C12.5589 3.9987 13.4364 3.9987 14.0067 4.51167C14.0592 4.55886 14.1091 4.60879 14.1563 4.66125C14.6693 5.2316 14.6693 6.10906 14.6693 7.86397V9.33203C14.6693 11.8462 14.6693 13.1033 13.8882 13.8843C13.1072 14.6654 11.8501 14.6654 9.33594 14.6654H6.66927C4.15511 14.6654 2.89803 14.6654 2.11699 13.8843C1.68153 13.4489 1.48885 12.8654 1.4036 11.9987"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.33594 10C5.6317 10 4.3735 10 8.66927 10M8.66927 10L5.91927 8M8.66927 10L5.91927 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_673_7045">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const EyeLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M2.18587 10.1984C1.61925 9.46228 1.33594 9.09422 1.33594 8.0013C1.33594 6.90838 1.61925 6.54032 2.18587 5.80419C3.31725 4.33434 5.21468 2.66797 8.0026 2.66797C10.7905 2.66797 12.688 4.33434 13.8193 5.80419C14.386 6.54032 14.6693 6.90838 14.6693 8.0013C14.6693 9.09422 14.386 9.46228 13.8193 10.1984C12.688 11.6683 10.7905 13.3346 8.0026 13.3346C5.21468 13.3346 3.31725 11.6683 2.18587 10.1984Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const EyeLineOff = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g>
        <path
          d="M2.18587 10.1984C1.61925 9.46228 1.33594 9.09422 1.33594 8.0013C1.33594 6.90838 1.61925 6.54032 2.18587 5.80419C3.31725 4.33434 5.21468 2.66797 8.0026 2.66797C10.7905 2.66797 12.688 4.33434 13.8193 5.80419C14.386 6.54032 14.6693 6.90838 14.6693 8.0013C14.6693 9.09422 14.386 9.46228 13.8193 10.1984C12.688 11.6683 10.7905 13.3346 8.0026 13.3346C5.21468 13.3346 3.31725 11.6683 2.18587 10.1984Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 8C10 9.10457 9.10457 10 8 10C6.89543 10 6 9.10457 6 8C6 6.89543 6.89543 6 8 6C9.10457 6 10 6.89543 10 8Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  );
};

export const CopyLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M5 9.16797C5 6.81095 5 5.63243 5.73223 4.9002C6.46447 4.16797 7.64298 4.16797 10 4.16797H12.5C14.857 4.16797 16.0355 4.16797 16.7678 4.9002C17.5 5.63243 17.5 6.81095 17.5 9.16797V13.3346C17.5 15.6917 17.5 16.8702 16.7678 17.6024C16.0355 18.3346 14.857 18.3346 12.5 18.3346H10C7.64298 18.3346 6.46447 18.3346 5.73223 17.6024C5 16.8702 5 15.6917 5 13.3346V9.16797Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M5 15.8346C3.61929 15.8346 2.5 14.7153 2.5 13.3346V8.33463C2.5 5.19194 2.5 3.62059 3.47631 2.64428C4.45262 1.66797 6.02397 1.66797 9.16667 1.66797H12.5C13.8807 1.66797 15 2.78726 15 4.16797"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const FilterLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M15.8307 2.5H4.16406C2.98555 2.5 2.3963 2.5 2.03018 2.8435C1.66406 3.187 1.66406 3.73985 1.66406 4.84555V5.4204C1.66406 6.28527 1.66406 6.7177 1.8804 7.07618C2.09673 7.43466 2.49196 7.65715 3.28241 8.10212L5.70993 9.46865C6.24028 9.7672 6.50545 9.91648 6.69532 10.0813C7.09072 10.4246 7.33413 10.8279 7.44443 11.3226C7.4974 11.5602 7.4974 11.8382 7.4974 12.3941L7.4974 14.6187C7.4974 15.3766 7.4974 15.7556 7.70733 16.0511C7.91727 16.3465 8.29013 16.4923 9.03586 16.7838C10.6014 17.3958 11.3841 17.7018 11.9408 17.3537C12.4974 17.0055 12.4974 16.2099 12.4974 14.6187V12.3941C12.4974 11.8382 12.4974 11.5602 12.5504 11.3226C12.6607 10.8279 12.9041 10.4246 13.2995 10.0813C13.4893 9.91648 13.7545 9.7672 14.2849 9.46865L16.7124 8.10212C17.5028 7.65715 17.8981 7.43466 18.1144 7.07618C18.3307 6.7177 18.3307 6.28527 18.3307 5.4204V4.84555C18.3307 3.73985 18.3307 3.187 17.9646 2.8435C17.5985 2.5 17.0092 2.5 15.8307 2.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const DialogLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.48822 4.42445C8.47152 2.42251 10.531 1.04297 12.9141 1.04297C16.2508 1.04297 18.9557 3.74792 18.9557 7.08464C18.9557 7.97804 18.7614 8.82777 18.4121 9.59242C18.321 9.79197 18.3032 9.98047 18.3438 10.1319L18.4499 10.5286C18.7897 11.7985 17.6279 12.9602 16.3581 12.6205L15.9614 12.5143C15.8486 12.4842 15.7154 12.4863 15.5723 12.5269C15.1473 16.1492 12.0672 18.9596 8.33073 18.9596C7.20576 18.9596 6.13863 18.7044 5.18564 18.2482C4.99698 18.1579 4.81123 18.1396 4.65843 18.1804L3.63673 18.4538C2.36687 18.7936 1.20512 17.6318 1.54489 16.362L1.81826 15.3403C1.85915 15.1875 1.84082 15.0017 1.7505 14.8131C1.29426 13.8601 1.03906 12.7929 1.03906 11.668C1.03906 7.92584 3.858 4.84211 7.48822 4.42445ZM8.94322 4.40166C12.5472 4.7014 15.4069 7.62223 15.6108 11.2526C15.8295 11.2318 16.0569 11.2459 16.2845 11.3068L16.6811 11.4129C17.0218 11.5041 17.3335 11.1924 17.2424 10.8517L17.1362 10.455C17.0053 9.96558 17.0906 9.47698 17.2751 9.07306C17.5514 8.46815 17.7057 7.79526 17.7057 7.08464C17.7057 4.43827 15.5604 2.29297 12.9141 2.29297C11.2625 2.29297 9.80507 3.12867 8.94322 4.40166ZM8.33073 5.6263C4.99401 5.6263 2.28906 8.33125 2.28906 11.668C2.28906 12.6022 2.50066 13.4852 2.87796 14.2733C3.07412 14.683 3.15639 15.1752 3.02579 15.6634L2.75242 16.6851C2.66126 17.0258 2.97295 17.3374 3.31364 17.2463L4.33534 16.9729C4.82345 16.8423 5.31565 16.9246 5.72541 17.1207C6.5135 17.498 7.39653 17.7096 8.33073 17.7096C11.6675 17.7096 14.3724 15.0047 14.3724 11.668C14.3724 8.33125 11.6675 5.6263 8.33073 5.6263Z"
          fill="currentColor"
        />
        <path
          d="M6.2474 11.668C6.2474 12.1282 5.8743 12.5013 5.41406 12.5013C4.95383 12.5013 4.58073 12.1282 4.58073 11.668C4.58073 11.2077 4.95383 10.8346 5.41406 10.8346C5.8743 10.8346 6.2474 11.2077 6.2474 11.668Z"
          fill="currentColor"
        />
        <path
          d="M9.16406 11.668C9.16406 12.1282 8.79097 12.5013 8.33073 12.5013C7.87049 12.5013 7.4974 12.1282 7.4974 11.668C7.4974 11.2077 7.87049 10.8346 8.33073 10.8346C8.79097 10.8346 9.16406 11.2077 9.16406 11.668Z"
          fill="currentColor"
        />
        <path
          d="M12.0807 11.668C12.0807 12.1282 11.7076 12.5013 11.2474 12.5013C10.7872 12.5013 10.4141 12.1282 10.4141 11.668C10.4141 11.2077 10.7872 10.8346 11.2474 10.8346C11.7076 10.8346 12.0807 11.2077 12.0807 11.668Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const PlainLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1375_6084)">
        <path
          d="M12.4264 10.4455L13.5707 7.01257C14.5703 4.01364 15.0701 2.51418 14.2786 1.72267C13.4871 0.931155 11.9877 1.43097 8.98874 2.43062L5.55585 3.57491C3.13543 4.38172 1.92522 4.78512 1.58131 5.37669C1.25415 5.93945 1.25415 6.63449 1.58131 7.19725C1.92522 7.78882 3.13543 8.19222 5.55585 8.99903C5.94449 9.12857 6.1388 9.19335 6.30123 9.30208C6.45863 9.40746 6.59385 9.54267 6.69923 9.70008C6.80796 9.8625 6.87273 10.0568 7.00228 10.4455C7.80908 12.8659 8.21248 14.0761 8.80405 14.42C9.36681 14.7472 10.0619 14.7472 10.6246 14.42C11.2162 14.0761 11.6196 12.8659 12.4264 10.4455Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10.9845 6.07787C11.279 5.78661 11.2816 5.31174 10.9904 5.01723C10.6991 4.72272 10.2242 4.72009 9.92972 5.01135L10.9845 6.07787ZM7.2852 9.73639L10.9845 6.07787L9.92972 5.01135L6.23043 8.66986L7.2852 9.73639Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1375_6084">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const NotebookLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <path
          d="M2.5 6.66797C2.5 4.31095 2.5 3.13243 3.23223 2.4002C3.96447 1.66797 5.14298 1.66797 7.5 1.66797H12.5C14.857 1.66797 16.0355 1.66797 16.7678 2.4002C17.5 3.13243 17.5 4.31095 17.5 6.66797V13.3346C17.5 15.6917 17.5 16.8702 16.7678 17.6024C16.0355 18.3346 14.857 18.3346 12.5 18.3346H7.5C5.14298 18.3346 3.96447 18.3346 3.23223 17.6024C2.5 16.8702 2.5 15.6917 2.5 13.3346V6.66797Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6.66406 2.08203V18.332"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.66406 10H3.33073"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.66406 13.332H3.33073"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.66406 6.66797H3.33073"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M9.58594 5.41797H13.7526"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M9.58594 8.33203H13.7526"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const UserBlockLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g>
        <circle cx="9.9974" cy="5.0013" r="3.33333" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14.1693" cy="15.0013" r="3.33333" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16.6641 12.5L11.6641 17.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M11.6641 17.3607C11.136 17.4505 10.5765 17.4987 9.9974 17.4987C6.77573 17.4987 4.16406 16.0063 4.16406 14.1654C4.16406 12.3244 6.77573 10.832 9.9974 10.832C11.4253 10.832 12.7334 11.1252 13.7474 11.612"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </g>
    </svg>
  );
};
export const MessageLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M17.8125 17.8125V6.5625H5.9375V14.0625H13.4375L17.8125 17.8125Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.9375 9.0625L2.1875 12.8125V2.1875H14.6875V5.9375"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const VideoLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M18.9688 8.65625C18.6562 8.40625 18.25 8.3125 17.8438 8.40625L14.875 9.0625C14.7812 8.09375 13.9375 7.3125 12.9375 7.3125H12.0938C12.3125 6.90625 12.4375 6.46875 12.4375 5.96875C12.4375 4.46875 11.2188 3.21875 9.71875 3.21875C8.28125 3.21875 7.125 4.3125 7 5.71875C6.65625 5 5.9375 4.46875 5.09375 4.46875C3.9375 4.46875 2.96875 5.40625 2.96875 6.59375C2.96875 6.84375 3 7.0625 3.09375 7.3125H2.5C1.4375 7.3125 0.53125 8.1875 0.53125 9.28125V14.8125C0.53125 15.875 1.40625 16.7812 2.5 16.7812H12.9375C14 16.7812 14.9062 15.9063 14.9062 14.8125V14.6563L17.8438 15.3125C17.9375 15.3438 18.0312 15.3438 18.125 15.3438C18.4375 15.3438 18.7188 15.25 18.9375 15.0625C19.25 14.8125 19.4375 14.4375 19.4375 14.0313V9.6875C19.4688 9.28125 19.2812 8.90625 18.9688 8.65625ZM9.71875 4.65625C10.4375 4.65625 11.0312 5.25 11.0312 6C11.0312 6.75 10.4375 7.34375 9.71875 7.34375C9 7.34375 8.375 6.75 8.375 6C8.375 5.25 9 4.65625 9.71875 4.65625ZM7.34375 7.3125H7.09375L7.1875 6.9375C7.21875 7.0625 7.25 7.1875 7.34375 7.3125ZM4.375 6.625C4.375 6.25 4.6875 5.90625 5.09375 5.90625C5.5 5.90625 5.8125 6.21875 5.8125 6.625C5.8125 7.03125 5.5 7.34375 5.09375 7.34375C4.6875 7.34375 4.375 7 4.375 6.625ZM13.5 14.7812C13.5 15.0938 13.25 15.3438 12.9375 15.3438H2.5C2.1875 15.3438 1.9375 15.0938 1.9375 14.7812V9.28125C1.9375 8.96875 2.1875 8.71875 2.5 8.71875H12.9375C13.25 8.71875 13.5 8.96875 13.5 9.28125V14.7812ZM18.0625 13.9062L14.9062 13.2188V10.5L18.0625 9.8125V13.9062Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const NotificationLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <path
        d="M5.36128 2.64749C5.46634 2.52209 5.51805 2.36051 5.50531 2.19741C5.49257 2.03432 5.41639 1.88272 5.29313 1.77517C5.16986 1.66761 5.00934 1.61267 4.84603 1.62214C4.68271 1.63161 4.52962 1.70474 4.41961 1.82582L3.34295 3.05916C2.73243 3.75879 2.38731 4.6508 2.36795 5.57916L2.32045 7.84499C2.31875 7.92706 2.33324 8.00867 2.36308 8.08515C2.39292 8.16163 2.43753 8.23148 2.49437 8.29071C2.55121 8.34995 2.61916 8.39741 2.69434 8.43039C2.76951 8.46336 2.85045 8.48121 2.93253 8.48291C3.01461 8.4846 3.09621 8.47012 3.17269 8.44027C3.24917 8.41043 3.31902 8.36582 3.37825 8.30898C3.43749 8.25214 3.48495 8.1842 3.51793 8.10902C3.5509 8.03384 3.56875 7.9529 3.57045 7.87082L3.61711 5.60582C3.63048 4.97059 3.86676 4.36029 4.28461 3.88166L5.36128 2.64749Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.19469 7.05469C5.25066 6.16313 5.64429 5.32642 6.29546 4.71488C6.94663 4.10335 7.80638 3.76296 8.69969 3.76302H9.16386V3.13802C9.16386 2.91701 9.25166 2.70505 9.40794 2.54877C9.56422 2.39248 9.77618 2.30469 9.99719 2.30469C10.2182 2.30469 10.4302 2.39248 10.5864 2.54877C10.7427 2.70505 10.8305 2.91701 10.8305 3.13802V3.76302H11.2947C12.188 3.76296 13.0478 4.10335 13.6989 4.71488C14.3501 5.32642 14.7437 6.16313 14.7997 7.05469L14.9839 9.99969C15.0551 11.1224 15.432 12.2042 16.0739 13.128C16.2067 13.3189 16.2878 13.5409 16.3094 13.7724C16.331 14.004 16.2923 14.2372 16.1971 14.4493C16.1019 14.6615 15.9534 14.8454 15.7661 14.9831C15.5787 15.1209 15.3589 15.2079 15.128 15.2355L12.2889 15.5755V16.4714C12.2889 17.0791 12.0474 17.662 11.6176 18.0918C11.1879 18.5216 10.605 18.763 9.99719 18.763C9.3894 18.763 8.80651 18.5216 8.37674 18.0918C7.94697 17.662 7.70552 17.0791 7.70552 16.4714V15.5755L4.86636 15.2347C4.6356 15.2069 4.41595 15.12 4.22873 14.9823C4.04151 14.8446 3.89309 14.6608 3.7979 14.4487C3.70271 14.2367 3.66397 14.0037 3.68546 13.7722C3.70695 13.5408 3.78792 13.3189 3.92052 13.128C4.56239 12.2042 4.93933 11.1224 5.01052 9.99969L5.19469 7.05469ZM8.69969 5.01302C8.12434 5.01295 7.57058 5.23216 7.15117 5.62603C6.73176 6.01989 6.47823 6.5588 6.44219 7.13302L6.25886 10.078C6.17318 11.4286 5.71958 12.7301 4.94719 13.8414C4.93758 13.8552 4.93171 13.8712 4.93014 13.888C4.92857 13.9047 4.93136 13.9216 4.93824 13.9369C4.94511 13.9523 4.95585 13.9656 4.96939 13.9756C4.98293 13.9855 4.99883 13.9918 5.01552 13.9939L8.12969 14.368C9.37052 14.5164 10.6239 14.5164 11.8647 14.368L14.9789 13.9939C14.9956 13.9918 15.0114 13.9855 15.025 13.9756C15.0385 13.9656 15.0493 13.9523 15.0561 13.9369C15.063 13.9216 15.0658 13.9047 15.0642 13.888C15.0627 13.8712 15.0568 13.8552 15.0472 13.8414C14.2751 12.73 13.8218 11.4286 13.7364 10.078L13.5522 7.13302C13.5162 6.5588 13.2626 6.01989 12.8432 5.62603C12.4238 5.23216 11.87 5.01295 11.2947 5.01302H8.69969ZM9.99719 17.513C9.42219 17.513 8.95552 17.0464 8.95552 16.4714V15.8464H11.0389V16.4714C11.0389 17.0464 10.5722 17.513 9.99719 17.513Z"
        fill="currentColor"
      />
      <path
        d="M14.7062 1.76727C14.5813 1.87625 14.5049 2.03035 14.4936 2.19568C14.4824 2.36102 14.5372 2.52405 14.6462 2.64894L15.7228 3.88227C16.1406 4.36124 16.3766 4.97186 16.3895 5.60727L16.437 7.87144C16.4404 8.0372 16.5096 8.19481 16.6292 8.3096C16.7488 8.42439 16.9092 8.48695 17.0749 8.48352C17.2407 8.4801 17.3983 8.41096 17.5131 8.29133C17.6279 8.1717 17.6904 8.01137 17.687 7.84561L17.6395 5.58061C17.6201 4.65225 17.275 3.76024 16.6645 3.06061L15.5878 1.82727C15.4789 1.70243 15.3248 1.62598 15.1594 1.61472C14.9941 1.60347 14.8311 1.65834 14.7062 1.76727Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const NotificationLine2 = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2 10.0031C2 8.33646 2.371 6.80746 3.113 5.41613C3.855 4.02479 4.85067 2.87046 6.1 1.95312L7.275 3.55312C6.275 4.28646 5.47933 5.21146 4.888 6.32812C4.29667 7.44479 4.00067 8.66979 4 10.0031H2ZM20 10.0031C20 8.66979 19.704 7.44479 19.112 6.32812C18.52 5.21146 17.7247 4.28646 16.726 3.55312L17.901 1.95312C19.151 2.86979 20.147 4.02413 20.889 5.41613C21.631 6.80813 22.0013 8.33713 22 10.0031H20ZM4 19.0031V17.0031H6V10.0031C6 8.61979 6.41667 7.39079 7.25 6.31612C8.08333 5.24146 9.16667 4.53712 10.5 4.20312V3.50312C10.5 3.08646 10.646 2.73246 10.938 2.44112C11.23 2.14979 11.584 2.00379 12 2.00312C12.416 2.00246 12.7703 2.14846 13.063 2.44112C13.3557 2.73379 13.5013 3.08779 13.5 3.50312V4.20312C14.8333 4.53646 15.9167 5.24079 16.75 6.31612C17.5833 7.39146 18 8.62046 18 10.0031V17.0031H20V19.0031H4ZM12 22.0031C11.45 22.0031 10.9793 21.8075 10.588 21.4161C10.1967 21.0248 10.0007 20.5538 10 20.0031H14C14 20.5531 13.8043 21.0241 13.413 21.4161C13.0217 21.8081 12.5507 22.0038 12 22.0031ZM8 17.0031H16V10.0031C16 8.90313 15.6083 7.96146 14.825 7.17813C14.0417 6.39479 13.1 6.00313 12 6.00313C10.9 6.00313 9.95833 6.39479 9.175 7.17813C8.39167 7.96146 8 8.90313 8 10.0031V17.0031Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SpeakerLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <path
        d="M10.8675 3.09701C10.9807 3.14466 11.0774 3.22461 11.1454 3.32688C11.2134 3.42914 11.2498 3.54918 11.25 3.67201V17.422C11.25 17.5451 11.2136 17.6654 11.1455 17.7679C11.0774 17.8704 10.9805 17.9505 10.867 17.9982C10.7535 18.0458 10.6285 18.0589 10.5076 18.0358C10.3868 18.0127 10.2754 17.9544 10.1875 17.8683L6.52875 14.2745H4.375C3.87772 14.2745 3.40081 14.077 3.04917 13.7253C2.69754 13.3737 2.5 12.8968 2.5 12.3995V8.66201C2.5 8.16472 2.69754 7.68781 3.04917 7.33618C3.40081 6.98455 3.87772 6.78701 4.375 6.78701H6.53L10.1888 3.22451C10.2767 3.1387 10.388 3.08072 10.5087 3.05782C10.6294 3.03493 10.7542 3.04937 10.8675 3.09701ZM10 5.15201L7.22125 7.86076C7.10423 7.97485 6.94718 8.03857 6.78375 8.03826H4.375C4.20924 8.03826 4.05027 8.1041 3.93306 8.22131C3.81585 8.33852 3.75 8.4975 3.75 8.66326V12.3995C3.75 12.5653 3.81585 12.7242 3.93306 12.8414C4.05027 12.9587 4.20924 13.0245 4.375 13.0245H6.785C6.94861 13.0245 7.10568 13.0887 7.2225 13.2033L10 15.932V5.15201ZM12.6388 7.03201C12.6899 6.9677 12.7531 6.91409 12.825 6.87426C12.8968 6.83443 12.9758 6.80914 13.0574 6.79985C13.139 6.79057 13.2217 6.79746 13.3006 6.82013C13.3796 6.84281 13.4533 6.88082 13.5175 6.93201L13.52 6.93326L13.5225 6.93576L13.5287 6.94076L13.5475 6.95701L13.605 7.00701C13.6508 7.04867 13.71 7.10784 13.7825 7.18451C13.9237 7.33826 14.1075 7.56201 14.2887 7.85951C14.6525 8.45951 15.005 9.35076 15.005 10.5445C15.005 11.737 14.6525 12.6295 14.2887 13.2295C14.1429 13.4712 13.9733 13.6977 13.7825 13.9058C13.7022 13.9913 13.618 14.0731 13.53 14.1508L13.52 14.1595H13.5187C13.5187 14.1595 12.96 14.4633 12.64 14.062C12.5371 13.9333 12.4892 13.7691 12.5068 13.6052C12.5243 13.4413 12.6059 13.291 12.7338 13.187L12.7362 13.1845L12.7587 13.1645C12.7821 13.1437 12.8175 13.1083 12.865 13.0583C12.9989 12.9112 13.1178 12.7513 13.22 12.5808C13.4825 12.1495 13.755 11.4783 13.755 10.5433C13.755 9.60826 13.4825 8.93951 13.22 8.50951C13.0913 8.29748 12.9368 8.10224 12.76 7.92826L12.7375 7.90826C12.6085 7.80492 12.5258 7.65472 12.5073 7.49051C12.4887 7.3263 12.536 7.16145 12.6388 7.03201ZM14.7662 4.43201C14.7023 4.37905 14.6284 4.33938 14.5489 4.31532C14.4694 4.29125 14.3859 4.28327 14.3033 4.29184C14.2207 4.30041 14.1406 4.32536 14.0677 4.36523C13.9949 4.4051 13.9307 4.4591 13.8789 4.52406C13.8272 4.58902 13.7889 4.66364 13.7663 4.74357C13.7437 4.8235 13.7373 4.90713 13.7474 4.98956C13.7575 5.072 13.784 5.1516 13.8252 5.2237C13.8664 5.29581 13.9216 5.35897 13.9875 5.40951L14.0013 5.42201L14.0662 5.47826C14.1263 5.53076 14.21 5.61201 14.3175 5.72201C14.53 5.94326 14.8175 6.27576 15.105 6.71451C15.68 7.59076 16.255 8.88076 16.255 10.5508C16.2599 11.9136 15.8596 13.2471 15.105 14.382C14.8175 14.8195 14.53 15.1495 14.3175 15.3695C14.2169 15.474 14.1118 15.5741 14.0025 15.6695L13.9888 15.682H13.9875C13.8614 15.7864 13.7812 15.9361 13.7643 16.099C13.7474 16.2619 13.7951 16.4249 13.8971 16.5529C13.9992 16.681 14.1474 16.7639 14.3099 16.7839C14.4724 16.8038 14.6363 16.7591 14.7662 16.6595L14.8075 16.6258L14.9012 16.5445C14.98 16.4733 15.0887 16.372 15.2175 16.2383C15.5642 15.8782 15.8764 15.4865 16.15 15.0683C17.038 13.7294 17.509 12.1573 17.5037 10.5508C17.5071 8.94293 17.0362 7.36983 16.15 6.02826C15.8763 5.60959 15.5646 5.21709 15.2188 4.85576C15.088 4.72006 14.9512 4.59034 14.8088 4.46701L14.78 4.44326L14.7713 4.43576L14.7687 4.43326L14.7662 4.43201Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PaintPalletLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_92660)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.7275 13.7847C15.6975 10.1617 13.3915 6.40774 9.59254 5.38974C5.32553 4.24574 -0.722465 7.21274 0.546535 10.8007C0.929535 11.8847 1.68054 12.1417 3.22854 12.1637L3.33654 12.1657C4.43654 12.1787 4.80754 12.2657 5.01454 12.6017C5.22854 12.9497 5.23054 13.3577 5.06854 14.3897C5.00154 14.8117 4.98054 14.9587 4.95554 15.1837C4.81054 16.4837 5.02254 17.4577 5.84554 18.3437C8.42953 21.1277 13.6335 17.8647 14.7275 13.7847ZM1.48854 10.4677C0.580535 7.89774 5.70553 5.38374 9.33354 6.35574C12.6105 7.23374 14.5855 10.4487 13.7615 13.5257C12.8375 16.9717 8.47454 19.7077 6.57854 17.6657C5.98454 17.0257 5.83354 16.3327 5.94854 15.2957C5.97254 15.0907 5.99254 14.9517 6.05654 14.5457C6.25654 13.2707 6.25354 12.7097 5.86654 12.0787C5.40154 11.3227 4.80754 11.1847 3.34954 11.1667L3.24254 11.1647C2.08354 11.1487 1.68054 11.0107 1.48854 10.4677Z"
          fill="currentColor"
        />
        <path
          d="M4.75 9.95104C4.41848 9.95104 4.10054 9.81934 3.86612 9.58492C3.6317 9.3505 3.5 9.03256 3.5 8.70104C3.5 8.36952 3.6317 8.05157 3.86612 7.81715C4.10054 7.58273 4.41848 7.45104 4.75 7.45104C5.08152 7.45104 5.39946 7.58273 5.63388 7.81715C5.8683 8.05157 6 8.36952 6 8.70104C6 9.03256 5.8683 9.3505 5.63388 9.58492C5.39946 9.81934 5.08152 9.95104 4.75 9.95104ZM8.75 9.95104C8.41848 9.95104 8.10054 9.81934 7.86612 9.58492C7.6317 9.3505 7.5 9.03256 7.5 8.70104C7.5 8.36952 7.6317 8.05157 7.86612 7.81715C8.10054 7.58273 8.41848 7.45104 8.75 7.45104C9.08152 7.45104 9.39946 7.58273 9.63388 7.81715C9.8683 8.05157 10 8.36952 10 8.70104C10 9.03256 9.8683 9.3505 9.63388 9.58492C9.39946 9.81934 9.08152 9.95104 8.75 9.95104ZM11.25 12.951C10.9185 12.951 10.6005 12.8193 10.3661 12.5849C10.1317 12.3505 10 12.0326 10 11.701C10 11.3695 10.1317 11.0516 10.3661 10.8172C10.6005 10.5827 10.9185 10.451 11.25 10.451C11.5815 10.451 11.8995 10.5827 12.1339 10.8172C12.3683 11.0516 12.5 11.3695 12.5 11.701C12.5 12.0326 12.3683 12.3505 12.1339 12.5849C11.8995 12.8193 11.5815 12.951 11.25 12.951ZM9.75 16.451C9.41848 16.451 9.10054 16.3193 8.86612 16.0849C8.6317 15.8505 8.5 15.5326 8.5 15.201C8.5 14.8695 8.6317 14.5516 8.86612 14.3172C9.10054 14.0827 9.41848 13.951 9.75 13.951C10.0815 13.951 10.3995 14.0827 10.6339 14.3172C10.8683 14.5516 11 14.8695 11 15.201C11 15.5326 10.8683 15.8505 10.6339 16.0849C10.3995 16.3193 10.0815 16.451 9.75 16.451ZM13.37 4.05604C13.4886 3.99251 13.6187 3.95356 13.7527 3.94152C13.8867 3.92947 14.0217 3.94458 14.1497 3.98594C14.2777 4.0273 14.3961 4.09406 14.4977 4.18222C14.5993 4.27039 14.682 4.37814 14.741 4.49904L18.834 12.899C18.9023 13.05 18.9106 13.2214 18.8571 13.3782C18.8037 13.5351 18.6925 13.6657 18.5461 13.7436C18.3998 13.8214 18.2293 13.8405 18.0694 13.7972C17.9094 13.7538 17.772 13.6511 17.685 13.51L12.977 5.44004C12.9096 5.32387 12.8663 5.19533 12.8497 5.06207C12.833 4.9288 12.8434 4.79355 12.8802 4.66439C12.9169 4.53522 12.9794 4.41479 13.0637 4.31027C13.148 4.20575 13.2525 4.11928 13.371 4.05604"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.5443 3.93596C12.0303 4.85096 12.8493 5.10696 13.6413 4.68596C14.4323 4.26596 14.6793 3.44296 14.1923 2.52796C13.6363 1.47996 12.4443 0.52996 11.6543 0.94896C10.8643 1.36796 10.9863 2.88796 11.5443 3.93596ZM12.4263 3.46596C12.25 3.1101 12.1414 2.72453 12.1063 2.32896C12.0916 2.16352 12.0977 1.9969 12.1243 1.83296L12.1423 1.84196C12.1923 1.86596 12.3473 1.93796 12.5453 2.09596C12.8473 2.33696 13.1473 2.69196 13.3093 2.99696C13.5383 3.42696 13.4733 3.64296 13.1713 3.80396C12.8713 3.96396 12.6553 3.89596 12.4263 3.46696"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_92660">
          <rect width="20" height="20" fill="white" transform="translate(0 0.453125)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const SecurityCheckLine = ({ className }: IconProps) => {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className={className}>
      <path
        d="M10.9955 2.19531C8.2382 2.19531 6.4507 4.04606 4.33687 4.72073C3.47704 4.99573 3.04712 5.13231 2.87295 5.32573C2.69879 5.51823 2.64837 5.80148 2.54662 6.36615C1.45579 12.4125 3.83912 18.0023 9.52245 20.1785C10.132 20.4122 10.4373 20.5286 10.9983 20.5286C11.5593 20.5286 11.8655 20.4113 12.476 20.1776C18.1584 18.0023 20.539 12.4125 19.4481 6.36615C19.3464 5.80148 19.295 5.51823 19.1209 5.32481C18.9467 5.1314 18.5177 4.99481 17.6579 4.72073C15.5431 4.04606 13.7529 2.19531 10.9955 2.19531Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 12.2799C8.25 12.2799 9.16667 12.2799 10.0833 14.1133C10.0833 14.1133 12.9956 9.52995 15.5833 8.61328"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const CalendarLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_92677)">
        <path
          d="M14.9974 3.60938H4.9974C3.15645 3.60938 1.66406 5.23623 1.66406 7.24306V16.3273C1.66406 18.3341 3.15645 19.9609 4.9974 19.9609H14.9974C16.8383 19.9609 18.3307 18.3341 18.3307 16.3273V7.24306C18.3307 5.23623 16.8383 3.60938 14.9974 3.60938Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g clipPath="url(#clip1_1224_92677)">
          <path
            d="M11.7359 15.4824L11.9069 15.3125L11.5098 14.9135L11.3396 15.0834L11.7359 15.4824ZM12.4803 15.2412L13.1969 15.6309L13.4651 15.1366L12.7488 14.7474L12.4803 15.2412ZM13.3346 16.4049L12.8021 16.9347L13.1984 17.3334L13.7309 16.8039L13.3346 16.4049ZM12.4773 17.105C11.9336 17.156 10.5273 17.1106 9.00407 15.5964L8.60732 15.995C10.2693 17.6476 11.8514 17.7286 12.5298 17.6652L12.4773 17.105ZM9.00407 15.5964C7.55244 14.1526 7.31169 12.9387 7.28169 12.4119L6.71994 12.4437C6.75744 13.1067 7.05557 14.4522 8.60732 15.995L9.00407 15.5964ZM9.51969 13.2789L9.62732 13.1716L9.23132 12.773L9.12369 12.8799L9.51969 13.2789ZM9.71282 11.8085L9.24031 11.177L8.78994 11.5145L9.26244 12.1456L9.71282 11.8085ZM7.64994 11.0394L7.06119 11.6244L7.45794 12.0234L8.04631 11.4384L7.64994 11.0394ZM9.32169 13.0794C9.12294 12.8799 9.12294 12.8799 9.12294 12.8806H9.12219L9.12107 12.8821C9.10324 12.9001 9.08729 12.9198 9.07344 12.941C9.05319 12.971 9.03107 13.0104 9.01232 13.0602C8.96667 13.189 8.9553 13.3274 8.97932 13.4619C9.02957 13.7862 9.25307 14.2149 9.82532 14.7841L10.2221 14.3851C9.68619 13.8526 9.55869 13.5286 9.53507 13.3756C9.52382 13.3029 9.53544 13.2669 9.53882 13.2586C9.54107 13.2536 9.54107 13.2529 9.53882 13.2564C9.53547 13.2615 9.53171 13.2664 9.52757 13.271L9.52381 13.2747L9.52007 13.2781L9.32169 13.0794ZM9.82532 14.7841C10.3979 15.3534 10.8288 15.5754 11.1536 15.6249C11.3197 15.6504 11.4536 15.6301 11.5552 15.5922C11.6121 15.5714 11.6653 15.5415 11.7127 15.5037L11.7314 15.4869L11.7341 15.4846L11.7352 15.4835L11.7356 15.4827C11.7356 15.4827 11.7359 15.4824 11.5376 15.2829C11.3388 15.0834 11.3399 15.083 11.3399 15.083L11.3407 15.0822L11.3414 15.0815L11.3437 15.0796L11.3474 15.0759L11.3617 15.0646C11.3652 15.0624 11.3643 15.0626 11.3591 15.0654C11.3497 15.0687 11.3129 15.0804 11.2391 15.0691C11.0838 15.0451 10.7576 14.9176 10.2221 14.3851L9.82532 14.7841ZM9.24031 11.1766C8.85782 10.6666 8.10631 10.5856 7.64994 11.0394L8.04631 11.4384C8.24582 11.24 8.59982 11.2606 8.78994 11.5145L9.24031 11.1766ZM7.28206 12.4122C7.27456 12.2825 7.33419 12.1467 7.45794 12.0237L7.06082 11.6247C6.85944 11.825 6.70082 12.1085 6.71994 12.4437L7.28206 12.4122ZM12.8021 16.9347C12.6993 17.0375 12.5883 17.0952 12.4777 17.1054L12.5298 17.6652C12.8054 17.6394 13.0308 17.5006 13.1988 17.3337L12.8021 16.9347ZM9.62732 13.1716C9.99669 12.8045 10.0241 12.2244 9.71319 11.8089L9.26282 12.146C9.41394 12.3481 9.39144 12.6132 9.23094 12.7734L9.62732 13.1716ZM13.1973 15.6312C13.5037 15.7977 13.5513 16.19 13.3349 16.4052L13.7317 16.8039C14.2342 16.304 14.0793 15.4704 13.4654 15.137L13.1973 15.6312ZM11.9069 15.3129C12.0509 15.1696 12.2827 15.1344 12.4807 15.2416L12.7492 14.7477C12.3427 14.5265 11.8387 14.5876 11.5102 14.9139L11.9069 15.3129Z"
            fill="currentColor"
          />
        </g>
        <path
          d="M6.66406 1.94141V5.27474M13.3307 1.94141V5.27474M1.66406 8.60807H18.3307"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_92677">
          <rect width="20" height="20" fill="white" transform="translate(0 0.273438)" />
        </clipPath>
        <clipPath id="clip1_1224_92677">
          <rect width="9" height="9" fill="white" transform="translate(5.5 10.2734)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const KeyboardLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <path
        d="M5.83073 7.6849C5.83073 7.90591 5.74293 8.11787 5.58665 8.27415C5.43037 8.43043 5.21841 8.51823 4.9974 8.51823C4.77638 8.51823 4.56442 8.43043 4.40814 8.27415C4.25186 8.11787 4.16406 7.90591 4.16406 7.6849C4.16406 7.46388 4.25186 7.25192 4.40814 7.09564C4.56442 6.93936 4.77638 6.85156 4.9974 6.85156C5.21841 6.85156 5.43037 6.93936 5.58665 7.09564C5.74293 7.25192 5.83073 7.46388 5.83073 7.6849ZM5.83073 10.1849C5.83073 10.4059 5.74293 10.6179 5.58665 10.7742C5.43037 10.9304 5.21841 11.0182 4.9974 11.0182C4.77638 11.0182 4.56442 10.9304 4.40814 10.7742C4.25186 10.6179 4.16406 10.4059 4.16406 10.1849C4.16406 9.96388 4.25186 9.75192 4.40814 9.59564C4.56442 9.43936 4.77638 9.35156 4.9974 9.35156C5.21841 9.35156 5.43037 9.43936 5.58665 9.59564C5.74293 9.75192 5.83073 9.96388 5.83073 10.1849ZM8.33073 10.1849C8.33073 10.4059 8.24293 10.6179 8.08665 10.7742C7.93037 10.9304 7.71841 11.0182 7.4974 11.0182C7.27638 11.0182 7.06442 10.9304 6.90814 10.7742C6.75186 10.6179 6.66406 10.4059 6.66406 10.1849C6.66406 9.96388 6.75186 9.75192 6.90814 9.59564C7.06442 9.43936 7.27638 9.35156 7.4974 9.35156C7.71841 9.35156 7.93037 9.43936 8.08665 9.59564C8.24293 9.75192 8.33073 9.96388 8.33073 10.1849ZM8.33073 7.6849C8.33073 7.90591 8.24293 8.11787 8.08665 8.27415C7.93037 8.43043 7.71841 8.51823 7.4974 8.51823C7.27638 8.51823 7.06442 8.43043 6.90814 8.27415C6.75186 8.11787 6.66406 7.90591 6.66406 7.6849C6.66406 7.46388 6.75186 7.25192 6.90814 7.09564C7.06442 6.93936 7.27638 6.85156 7.4974 6.85156C7.71841 6.85156 7.93037 6.93936 8.08665 7.09564C8.24293 7.25192 8.33073 7.46388 8.33073 7.6849ZM10.8307 7.6849C10.8307 7.90591 10.7429 8.11787 10.5867 8.27415C10.4304 8.43043 10.2184 8.51823 9.9974 8.51823C9.77638 8.51823 9.56442 8.43043 9.40814 8.27415C9.25186 8.11787 9.16406 7.90591 9.16406 7.6849C9.16406 7.46388 9.25186 7.25192 9.40814 7.09564C9.56442 6.93936 9.77638 6.85156 9.9974 6.85156C10.2184 6.85156 10.4304 6.93936 10.5867 7.09564C10.7429 7.25192 10.8307 7.46388 10.8307 7.6849ZM10.8307 10.1849C10.8307 10.4059 10.7429 10.6179 10.5867 10.7742C10.4304 10.9304 10.2184 11.0182 9.9974 11.0182C9.77638 11.0182 9.56442 10.9304 9.40814 10.7742C9.25186 10.6179 9.16406 10.4059 9.16406 10.1849C9.16406 9.96388 9.25186 9.75192 9.40814 9.59564C9.56442 9.43936 9.77638 9.35156 9.9974 9.35156C10.2184 9.35156 10.4304 9.43936 10.5867 9.59564C10.7429 9.75192 10.8307 9.96388 10.8307 10.1849ZM13.3307 7.6849C13.3307 7.90591 13.2429 8.11787 13.0867 8.27415C12.9304 8.43043 12.7184 8.51823 12.4974 8.51823C12.2764 8.51823 12.0644 8.43043 11.9081 8.27415C11.7519 8.11787 11.6641 7.90591 11.6641 7.6849C11.6641 7.46388 11.7519 7.25192 11.9081 7.09564C12.0644 6.93936 12.2764 6.85156 12.4974 6.85156C12.7184 6.85156 12.9304 6.93936 13.0867 7.09564C13.2429 7.25192 13.3307 7.46388 13.3307 7.6849ZM13.3307 10.1849C13.3307 10.4059 13.2429 10.6179 13.0867 10.7742C12.9304 10.9304 12.7184 11.0182 12.4974 11.0182C12.2764 11.0182 12.0644 10.9304 11.9081 10.7742C11.7519 10.6179 11.6641 10.4059 11.6641 10.1849C11.6641 9.96388 11.7519 9.75192 11.9081 9.59564C12.0644 9.43936 12.2764 9.35156 12.4974 9.35156C12.7184 9.35156 12.9304 9.43936 13.0867 9.59564C13.2429 9.75192 13.3307 9.96388 13.3307 10.1849ZM15.8307 7.6849C15.8307 7.90591 15.7429 8.11787 15.5867 8.27415C15.4304 8.43043 15.2184 8.51823 14.9974 8.51823C14.7764 8.51823 14.5644 8.43043 14.4081 8.27415C14.2519 8.11787 14.1641 7.90591 14.1641 7.6849C14.1641 7.46388 14.2519 7.25192 14.4081 7.09564C14.5644 6.93936 14.7764 6.85156 14.9974 6.85156C15.2184 6.85156 15.4304 6.93936 15.5867 7.09564C15.7429 7.25192 15.8307 7.46388 15.8307 7.6849ZM15.8307 10.1849C15.8307 10.4059 15.7429 10.6179 15.5867 10.7742C15.4304 10.9304 15.2184 11.0182 14.9974 11.0182C14.7764 11.0182 14.5644 10.9304 14.4081 10.7742C14.2519 10.6179 14.1641 10.4059 14.1641 10.1849C14.1641 9.96388 14.2519 9.75192 14.4081 9.59564C14.5644 9.43936 14.7764 9.35156 14.9974 9.35156C15.2184 9.35156 15.4304 9.43936 15.5867 9.59564C15.7429 9.75192 15.8307 9.96388 15.8307 10.1849Z"
        fill="currentColor"
      />
      <path
        d="M1.66406 9.35156C1.66406 6.9949 1.66406 5.81573 2.39656 5.08406C3.12823 4.35156 4.3074 4.35156 6.66406 4.35156H13.3307C15.6874 4.35156 16.8666 4.35156 17.5982 5.08406C18.3307 5.81573 18.3307 6.9949 18.3307 9.35156V11.0182C18.3307 13.3749 18.3307 14.5541 17.5982 15.2857C16.8666 16.0182 15.6874 16.0182 13.3307 16.0182H6.66406C4.3074 16.0182 3.12823 16.0182 2.39656 15.2857C1.66406 14.5541 1.66406 13.3749 1.66406 11.0182V9.35156Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.82812 13.5195H14.1615"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const Filter2Line = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <path
        d="M17.7057 10.092H7.4099M3.77573 10.092H2.28906M3.77573 10.092C3.77573 9.61022 3.96713 9.14814 4.30782 8.80745C4.64851 8.46676 5.11059 8.27536 5.5924 8.27536C6.07421 8.27536 6.53628 8.46676 6.87697 8.80745C7.21766 9.14814 7.40906 9.61022 7.40906 10.092C7.40906 10.5738 7.21766 11.0359 6.87697 11.3766C6.53628 11.7173 6.07421 11.9087 5.5924 11.9087C5.11059 11.9087 4.64851 11.7173 4.30782 11.3766C3.96713 11.0359 3.77573 10.5738 3.77573 10.092ZM17.7057 15.5979H12.9157M12.9157 15.5979C12.9157 16.0798 12.7239 16.5424 12.3831 16.8832C12.0423 17.2239 11.5802 17.4154 11.0982 17.4154C10.6164 17.4154 10.1543 17.2231 9.81365 16.8824C9.47296 16.5418 9.28156 16.0797 9.28156 15.5979M12.9157 15.5979C12.9157 15.1159 12.7239 14.6542 12.3831 14.3134C12.0423 13.9726 11.5802 13.7812 11.0982 13.7812C10.6164 13.7812 10.1543 13.9726 9.81365 14.3133C9.47296 14.654 9.28156 15.1161 9.28156 15.5979M9.28156 15.5979H2.28906M17.7057 4.5862H15.1182M11.4841 4.5862H2.28906M11.4841 4.5862C11.4841 4.10439 11.6755 3.64231 12.0162 3.30162C12.3568 2.96093 12.8189 2.76953 13.3007 2.76953C13.5393 2.76953 13.7755 2.81652 13.9959 2.90782C14.2163 2.99911 14.4166 3.13293 14.5853 3.30162C14.754 3.47031 14.8878 3.67058 14.9791 3.89099C15.0704 4.1114 15.1174 4.34763 15.1174 4.5862C15.1174 4.82477 15.0704 5.061 14.9791 5.28141C14.8878 5.50181 14.754 5.70208 14.5853 5.87077C14.4166 6.03947 14.2163 6.17328 13.9959 6.26458C13.7755 6.35588 13.5393 6.40286 13.3007 6.40286C12.8189 6.40286 12.3568 6.21147 12.0162 5.87077C11.6755 5.53008 11.4841 5.06801 11.4841 4.5862Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const AdministratorLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_92756)">
        <path
          d="M8.15399 8.22596C7.41098 8.22596 6.68466 8.00556 6.06694 7.59264C5.44922 7.17973 4.96787 6.59287 4.68378 5.9063C4.3997 5.21974 4.32565 4.46434 4.47101 3.73568C4.61637 3.00703 4.9746 2.33786 5.50038 1.81286C6.02616 1.28786 6.69586 0.930612 7.42473 0.786331C8.1536 0.64205 8.90889 0.717216 9.59503 1.00232C10.2812 1.28742 10.8673 1.76964 11.2793 2.38797C11.6913 3.0063 11.9106 3.73294 11.9095 4.47596C11.9066 5.47058 11.5098 6.42354 10.806 7.12633C10.1022 7.82911 9.14861 8.22449 8.15399 8.22596ZM8.15399 1.83151C7.63097 1.83151 7.11969 1.98661 6.68482 2.27718C6.24994 2.56776 5.91099 2.98076 5.71084 3.46397C5.51069 3.94718 5.45832 4.47889 5.56036 4.99186C5.6624 5.50483 5.91425 5.97603 6.28409 6.34586C6.65392 6.71569 7.12511 6.96755 7.63809 7.06959C8.15106 7.17163 8.68277 7.11926 9.16598 6.9191C9.64919 6.71895 10.0622 6.38001 10.3528 5.94513C10.6433 5.51025 10.7984 4.99898 10.7984 4.47596C10.7984 3.77461 10.5198 3.10198 10.0239 2.60605C9.52797 2.11012 8.85534 1.83151 8.15399 1.83151Z"
          fill="currentColor"
        />
        <path
          d="M9.12049 17.5997C8.99907 17.4783 8.9054 17.3319 8.84594 17.1708C8.78648 17.0097 8.76263 16.8376 8.77604 16.6664H2.22049V13.4553C3.008 12.6145 3.9634 11.9485 5.02478 11.5006C6.08615 11.0527 7.2298 10.8328 8.3816 10.8553H8.7816C8.7561 10.669 8.77391 10.4794 8.83365 10.3011C8.89339 10.1228 8.99345 9.96077 9.12604 9.82749L9.19271 9.76638C8.9316 9.76638 8.63715 9.73305 8.3816 9.73305C7.02627 9.70087 5.68072 9.97027 4.44225 10.5218C3.20378 11.0733 2.10333 11.8931 1.22049 12.9219C1.14836 13.0181 1.10937 13.1351 1.10938 13.2553V16.6664C1.10938 16.9611 1.22644 17.2437 1.43481 17.4521C1.64319 17.6604 1.9258 17.7775 2.22049 17.7775H9.27604L9.12049 17.5997Z"
          fill="currentColor"
        />
        <path
          d="M18.7089 12.9561L17.5978 12.6172C17.5184 12.3455 17.4104 12.0829 17.2755 11.8339L17.8311 10.8006C17.8492 10.7592 17.8535 10.7132 17.8435 10.6692C17.8335 10.6252 17.8097 10.5856 17.7755 10.5561L16.97 9.75058C16.9395 9.7176 16.8988 9.69583 16.8545 9.68878C16.8102 9.68173 16.7647 9.6898 16.7255 9.71169L15.7033 10.2672C15.4519 10.1251 15.1854 10.0115 14.9089 9.92836L14.57 8.81725C14.5556 8.77635 14.5283 8.74123 14.4922 8.71718C14.4562 8.69314 14.4133 8.68146 14.37 8.68391H13.2311C13.1873 8.68341 13.1446 8.69726 13.1095 8.72335C13.0744 8.74944 13.0488 8.78633 13.0366 8.82836L12.6978 9.93947C12.4195 10.0204 12.1512 10.1322 11.8978 10.2728L10.8866 9.71725C10.8483 9.69578 10.8038 9.68793 10.7604 9.69499C10.717 9.70205 10.6773 9.72361 10.6478 9.75614L9.82553 10.5561C9.79505 10.5882 9.77543 10.6291 9.76944 10.673C9.76346 10.7169 9.77142 10.7615 9.7922 10.8006L10.3478 11.8117C10.2009 12.0622 10.0835 12.3288 9.99776 12.6061L8.88665 12.9395C8.84462 12.9516 8.80773 12.9772 8.78164 13.0123C8.75555 13.0475 8.7417 13.0902 8.7422 13.1339V14.2728C8.74548 14.3129 8.76114 14.3511 8.78702 14.3819C8.81289 14.4128 8.8477 14.4348 8.88665 14.445L9.99776 14.7839C10.0799 15.0564 10.1916 15.3191 10.3311 15.5672L9.77553 16.6284C9.75434 16.6664 9.74612 16.7103 9.75214 16.7534C9.75815 16.7965 9.77807 16.8365 9.80887 16.8672L10.6144 17.6728C10.6459 17.7042 10.6865 17.7248 10.7303 17.7318C10.7742 17.7388 10.8192 17.7318 10.8589 17.7117L11.8978 17.1561C12.1448 17.2895 12.4056 17.3956 12.6755 17.4728L13.0089 18.5839C13.0225 18.625 13.0485 18.661 13.0833 18.6868C13.1181 18.7126 13.16 18.7271 13.2033 18.7284H14.3422C14.3857 18.728 14.428 18.7138 14.463 18.6878C14.4979 18.6619 14.5237 18.6255 14.5366 18.5839L14.8755 17.445C15.1416 17.3671 15.3987 17.2609 15.6422 17.1284L16.6922 17.6839C16.7308 17.7044 16.7751 17.7117 16.8182 17.7047C16.8613 17.6977 16.901 17.6767 16.9311 17.645L17.7755 16.8895C17.7982 16.8569 17.8104 16.8181 17.8104 16.7784C17.8104 16.7386 17.7982 16.6999 17.7755 16.6672L17.22 15.6228C17.3548 15.3777 17.4629 15.1188 17.5422 14.8506L18.6533 14.5117C18.6953 14.4995 18.7322 14.4739 18.7583 14.4388C18.7844 14.4037 18.7983 14.361 18.7978 14.3172V13.1506C18.8029 13.1131 18.7972 13.0749 18.7815 13.0405C18.7657 13.0061 18.7406 12.9768 18.7089 12.9561ZM13.8033 15.5561C13.4358 15.5572 13.0763 15.4492 12.7703 15.2457C12.4643 15.0423 12.2256 14.7525 12.0845 14.4132C11.9434 14.074 11.9062 13.7004 11.9776 13.3399C12.049 12.9795 12.2259 12.6484 12.4857 12.3885C12.7455 12.1287 13.0767 11.9518 13.4371 11.8804C13.7976 11.809 14.1711 11.8462 14.5104 11.9873C14.8497 12.1285 15.1394 12.3672 15.3429 12.6732C15.5464 12.9792 15.6544 13.3387 15.6533 13.7061C15.6518 14.1963 15.4565 14.666 15.1098 15.0127C14.7632 15.3593 14.2935 15.5547 13.8033 15.5561Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_92756">
          <rect width="20" height="20" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const ImageLine = ({ className }: IconProps) => {
  return (
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" className={className}>
      <path
        d="M14.9922 3.49609H7.20052C5.98495 3.49609 4.81916 3.97898 3.95961 4.83852C3.10007 5.69806 2.61719 6.86385 2.61719 8.07943V14.4961C2.61719 15.098 2.73574 15.694 2.96607 16.2501C3.19641 16.8061 3.53401 17.3114 3.95961 17.737C4.81916 18.5965 5.98495 19.0794 7.20052 19.0794H14.9922C15.5941 19.0794 16.1901 18.9609 16.7462 18.7305C17.3022 18.5002 17.8075 18.1626 18.2331 17.737C18.6587 17.3114 18.9963 16.8061 19.2266 16.2501C19.457 15.694 19.5755 15.098 19.5755 14.4961V8.07943C19.5755 7.47754 19.457 6.88154 19.2266 6.32546C18.9963 5.76939 18.6587 5.26412 18.2331 4.83852C17.8075 4.41292 17.3022 4.07531 16.7462 3.84498C16.1901 3.61465 15.5941 3.49609 14.9922 3.49609Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.84375 15.8706L5.36458 12.9372C5.69444 12.6096 6.12735 12.4061 6.59006 12.3609C7.05276 12.3158 7.51684 12.432 7.90375 12.6897C8.29066 12.9475 8.75474 13.0636 9.21744 13.0185C9.68015 12.9734 10.1131 12.7698 10.4429 12.4422L12.5788 10.3064C13.1925 9.69062 14.005 9.31293 14.8714 9.24073C15.7377 9.16853 16.6016 9.40653 17.3088 9.91224L19.5913 11.6814M7.42708 9.60974C7.62691 9.60974 7.82478 9.57038 8.0094 9.49391C8.19402 9.41744 8.36177 9.30535 8.50306 9.16405C8.64436 9.02275 8.75645 8.85501 8.83292 8.67039C8.90939 8.48577 8.94875 8.2879 8.94875 8.08807C8.94875 7.88825 8.90939 7.69037 8.83292 7.50576C8.75645 7.32114 8.64436 7.15339 8.50306 7.01209C8.36177 6.87079 8.19402 6.75871 8.0094 6.68224C7.82478 6.60577 7.62691 6.56641 7.42708 6.56641C7.02351 6.56641 6.63647 6.72672 6.3511 7.01209C6.06573 7.29746 5.90542 7.6845 5.90542 8.08807C5.90542 8.49164 6.06573 8.87869 6.3511 9.16405C6.63647 9.44942 7.02351 9.60974 7.42708 9.60974Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const PresentationLine = ({ className }: IconProps) => {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" className={className}>
      <path
        d="M2.60938 4.22266H17.6094M16.026 4.22266V12.371C16.026 12.7635 15.8677 13.1402 15.5869 13.4185C15.3052 13.696 14.9235 13.8518 14.526 13.8518H5.69271C5.29521 13.8518 4.91354 13.696 4.63187 13.4185C4.49308 13.2816 4.3828 13.1185 4.30742 12.9387C4.23204 12.7589 4.19305 12.5659 4.19271 12.371V4.22266M6.35937 17.556L10.1094 13.8527L13.8594 17.556"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const GIFLine = ({ className }: IconProps) => {
  return (
    <svg width="21" height="19" viewBox="0 0 21 19" fill="none" className={className}>
      <path
        d="M9.84371 9.0647V9.8457C9.86 10.3519 9.73869 10.853 9.49271 11.2957C9.26092 11.6941 8.91931 12.0173 8.50871 12.2267C8.06871 12.4507 7.57871 12.5627 7.08571 12.5517C6.53292 12.5634 5.98706 12.427 5.50471 12.1567C5.05036 11.89 4.68398 11.4961 4.45071 11.0237C4.18105 10.4781 4.04823 9.8751 4.06371 9.2667C4.05771 8.7937 4.13371 8.3237 4.29171 7.8787C4.42826 7.49543 4.64393 7.14517 4.92471 6.8507C5.19371 6.5677 5.51971 6.3467 5.88171 6.2007C6.25571 6.0507 6.65671 5.9757 7.05971 5.9807C7.40271 5.9787 7.74371 6.0317 8.06971 6.1397C8.36671 6.2397 8.64571 6.3877 8.89471 6.5787C9.13471 6.7687 9.33771 7.0007 9.49271 7.2637C9.64771 7.5337 9.74871 7.8337 9.79071 8.1417H8.41271C8.37605 7.99865 8.31699 7.8623 8.23771 7.7377C8.16087 7.62084 8.06245 7.5197 7.94771 7.4397C7.83154 7.35211 7.70041 7.28637 7.56071 7.2457C7.40221 7.21105 7.23956 7.19926 7.07771 7.2107C6.76771 7.2007 6.46271 7.2837 6.19971 7.4477C5.94429 7.62457 5.74588 7.87197 5.62871 8.1597C5.47871 8.5177 5.40571 8.9047 5.41771 9.2927C5.40971 9.6807 5.47771 10.0657 5.61971 10.4257C5.74271 10.7127 5.94371 10.9587 6.19971 11.1377C6.45971 11.3077 6.76671 11.3937 7.07771 11.3837C7.34771 11.3917 7.61671 11.3337 7.85971 11.2167C8.08023 11.1119 8.26166 10.9395 8.37771 10.7247C8.48571 10.5187 8.54271 10.2897 8.54471 10.0567H7.13871V9.0647H9.84371ZM12.3057 6.1827V12.3937C12.3052 12.4167 12.2959 12.4387 12.2797 12.455C12.2636 12.4714 12.2417 12.4809 12.2187 12.4817H11.0417C11.0299 12.483 11.0179 12.4815 11.0066 12.4776C10.9954 12.4736 10.9851 12.4671 10.9767 12.4587C10.9683 12.4503 10.9618 12.4401 10.9579 12.4288C10.9539 12.4176 10.9525 12.4056 10.9537 12.3937V6.1837C10.9516 6.16562 10.9556 6.14734 10.9653 6.13188C10.9749 6.11643 10.9895 6.10472 11.0067 6.0987C11.0181 6.09565 11.03 6.09463 11.0417 6.0957H12.2187C12.2417 6.0962 12.2637 6.1055 12.28 6.12168C12.2964 6.13786 12.306 6.1597 12.3067 6.1827M13.4147 12.3937V6.1837C13.4152 6.16052 13.4247 6.13844 13.4411 6.12204C13.4574 6.10565 13.4795 6.09621 13.5027 6.0957H17.6487V7.2107H14.8907C14.8675 7.21121 14.8454 7.22065 14.8291 7.23704C14.8127 7.25344 14.8032 7.27552 14.8027 7.2987V8.6427C14.8053 8.66516 14.8154 8.68608 14.8314 8.70206C14.8473 8.71804 14.8683 8.72814 14.8907 8.7307H17.4027V9.8457H14.8907C14.8675 9.84621 14.8454 9.85565 14.8291 9.87204C14.8127 9.88844 14.8032 9.91052 14.8027 9.9337V12.3937C14.804 12.4056 14.8026 12.4176 14.7986 12.4288C14.7946 12.4401 14.7882 12.4503 14.7797 12.4587C14.7713 12.4672 14.7611 12.4736 14.7498 12.4776C14.7386 12.4816 14.7266 12.483 14.7147 12.4817H13.5377C13.5236 12.4877 13.5083 12.4901 13.493 12.4885C13.4778 12.4869 13.4633 12.4815 13.4507 12.4727C13.4385 12.4636 13.4289 12.4516 13.4226 12.4378C13.4163 12.424 13.4136 12.4088 13.4147 12.3937Z"
        fill="currentColor"
      />
      <path
        d="M15.4844 1.01562H6.23438C3.68038 1.01562 1.60938 3.06763 1.60938 5.59863V12.9326C1.60938 15.4636 3.67937 17.5156 6.23438 17.5156H15.4844C18.0384 17.5156 20.1094 15.4636 20.1094 12.9326V5.59863C20.1094 3.06763 18.0394 1.01562 15.4844 1.01562Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const NoticeLine = ({ className }: IconProps) => {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={className}>
      <path
        d="M6.10937 2.64062C8.31487 2.64062 10.1094 4.43512 10.1094 6.64062C10.1094 8.84612 8.31487 10.6406 6.10937 10.6406C3.90387 10.6406 2.10937 8.84612 2.10937 6.64062C2.10937 4.43512 3.90387 2.64062 6.10937 2.64062ZM6.10937 1.64062C3.34787 1.64062 1.10938 3.87912 1.10938 6.64062C1.10938 9.40212 3.34787 11.6406 6.10937 11.6406C8.87087 11.6406 11.1094 9.40212 11.1094 6.64062C11.1094 3.87912 8.87087 1.64062 6.10937 1.64062ZM6.60937 8.14062H5.60937V9.14062H6.60937V8.14062ZM5.60937 7.14062H6.60937L6.85937 4.14062H5.35937L5.60937 7.14062Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SearchMinusLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_100353)">
        <path
          d="M13.25 12.5547L10.75 10.0547M12 6.30469C12 7.63077 11.4732 8.90254 10.5355 9.84022C9.59785 10.7779 8.32608 11.3047 7 11.3047C5.67392 11.3047 4.40215 10.7779 3.46447 9.84022C2.52678 8.90254 2 7.63077 2 6.30469C2 4.97861 2.52678 3.70684 3.46447 2.76915C4.40215 1.83147 5.67392 1.30469 7 1.30469C8.32608 1.30469 9.59785 1.83147 10.5355 2.76915C11.4732 3.70684 12 4.97861 12 6.30469Z"
          stroke="currentColor"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4.75781 6.14062H8.90255"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_100353">
          <rect width="15" height="15" fill="white" transform="translate(0.125 0.289062)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const SearchPlusLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_100357)">
        <path
          d="M13.2734 12.5547L10.7734 10.0547M12.0234 6.30469C12.0234 7.63077 11.4967 8.90254 10.559 9.84022C9.62129 10.7779 8.34952 11.3047 7.02344 11.3047C5.69736 11.3047 4.42559 10.7779 3.4879 9.84022C2.55022 8.90254 2.02344 7.63077 2.02344 6.30469C2.02344 4.97861 2.55022 3.70684 3.4879 2.76915C4.42559 1.83147 5.69736 1.30469 7.02344 1.30469C8.34952 1.30469 9.62129 1.83147 10.559 2.76915C11.4967 3.70684 12.0234 4.97861 12.0234 6.30469Z"
          stroke="currentColor"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.34375 4.98828C7.34375 4.92198 7.31741 4.85839 7.27053 4.8115C7.22364 4.76462 7.16005 4.73828 7.09375 4.73828C7.02745 4.73828 6.96386 4.76462 6.91697 4.8115C6.87009 4.85839 6.84375 4.92198 6.84375 4.98828V6.23828H5.59375C5.52745 6.23828 5.46386 6.26462 5.41697 6.3115C5.37009 6.35839 5.34375 6.42198 5.34375 6.48828C5.34375 6.55459 5.37009 6.61817 5.41697 6.66506C5.46386 6.71194 5.52745 6.73828 5.59375 6.73828H6.84375V7.98828C6.84375 8.05459 6.87009 8.11817 6.91697 8.16506C6.96386 8.21194 7.02745 8.23828 7.09375 8.23828C7.16005 8.23828 7.22364 8.21194 7.27053 8.16506C7.31741 8.11817 7.34375 8.05459 7.34375 7.98828V6.73828H8.59375C8.66005 6.73828 8.72364 6.71194 8.77053 6.66506C8.81741 6.61817 8.84375 6.55459 8.84375 6.48828C8.84375 6.42198 8.81741 6.35839 8.77053 6.3115C8.72364 6.26462 8.66005 6.23828 8.59375 6.23828H7.34375V4.98828Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_100357">
          <rect width="15" height="15" fill="white" transform="translate(0.148438 0.289062)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const PlayLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="21" viewBox="0 0 20 21" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_92883)">
        <path
          d="M9.6875 0.453125C12.2071 0.453125 14.6234 1.50669 16.405 3.38206C18.1866 5.25742 19.1875 7.80096 19.1875 10.4531C19.1875 13.1053 18.1866 15.6488 16.405 17.5242C14.6234 19.3996 12.2071 20.4531 9.6875 20.4531C7.16794 20.4531 4.75158 19.3996 2.96999 17.5242C1.18839 15.6488 0.1875 13.1053 0.1875 10.4531C0.1875 7.80096 1.18839 5.25742 2.96999 3.38206C4.75158 1.50669 7.16794 0.453125 9.6875 0.453125ZM1.96875 10.4531C1.96875 12.608 2.78197 14.6746 4.22952 16.1984C5.67707 17.7221 7.64036 18.5781 9.6875 18.5781C11.7346 18.5781 13.6979 17.7221 15.1455 16.1984C16.593 14.6746 17.4062 12.608 17.4062 10.4531C17.4062 8.29824 16.593 6.23162 15.1455 4.70788C13.6979 3.18415 11.7346 2.32812 9.6875 2.32812C7.64036 2.32812 5.67707 3.18415 4.22952 4.70788C2.78197 6.23162 1.96875 8.29824 1.96875 10.4531ZM7.76256 6.98688L12.8261 10.1856C12.8698 10.2134 12.906 10.2527 12.9311 10.2996C12.9563 10.3464 12.9695 10.3993 12.9695 10.4531C12.9695 10.5069 12.9563 10.5598 12.9311 10.6067C12.906 10.6536 12.8698 10.6928 12.8261 10.7206L7.76256 13.9194C7.71754 13.9479 7.66611 13.9634 7.61355 13.9642C7.56099 13.9649 7.50918 13.951 7.46341 13.9238C7.41764 13.8966 7.37955 13.8571 7.35303 13.8093C7.32652 13.7615 7.31253 13.7072 7.3125 13.6519V7.25562C7.31232 7.20019 7.32615 7.1457 7.35258 7.09774C7.37901 7.04979 7.41708 7.0101 7.46289 6.98275C7.5087 6.95539 7.5606 6.94136 7.61326 6.94208C7.66592 6.94281 7.71745 6.95827 7.76256 6.98688Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_92883">
          <rect width="19" height="20" fill="white" transform="translate(0.1875 0.453125)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const ChangeSite = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M4 5.40368C4 3.15497 5.79086 1.33203 8 1.33203C10.2091 1.33203 12 3.15497 12 5.40368C12 7.63477 10.7233 10.2382 8.73147 11.1693C8.26713 11.3863 7.73287 11.3863 7.26853 11.1693C5.27666 10.2382 4 7.63477 4 5.40368ZM8 6.66536C8.73638 6.66536 9.33333 6.06841 9.33333 5.33203C9.33333 4.59565 8.73638 3.9987 8 3.9987C7.26362 3.9987 6.66667 4.59565 6.66667 5.33203C6.66667 6.06841 7.26362 6.66536 8 6.66536Z"
          fill="#1C274C"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.42081 9.68951C2.5923 9.90595 2.55586 10.2204 2.33942 10.3919C1.95698 10.6949 1.83594 10.962 1.83594 11.1667C1.83594 11.3287 1.90946 11.5254 2.1297 11.7531C2.35219 11.9831 2.69982 12.2168 3.17298 12.4314C4.00914 12.8106 5.16495 13.0978 6.5026 13.2229V12.9167C6.5026 12.7205 6.61734 12.5424 6.796 12.4614C6.97465 12.3803 7.18421 12.4112 7.33186 12.5404L8.33186 13.4154C8.44036 13.5103 8.5026 13.6475 8.5026 13.7917C8.5026 13.9359 8.44036 14.073 8.33186 14.168L7.33186 15.043C7.18421 15.1722 6.97465 15.2031 6.796 15.122C6.61734 15.0409 6.5026 14.8629 6.5026 14.6667V14.227C5.04602 14.0992 3.74212 13.7876 2.75993 13.3421C2.21736 13.096 1.74973 12.7986 1.4109 12.4483C1.06981 12.0956 0.835938 11.6627 0.835938 11.1667C0.835938 10.5332 1.21371 10.008 1.71841 9.60812C1.93485 9.43663 2.24932 9.47307 2.42081 9.68951ZM13.5844 9.68951C13.7559 9.47307 14.0704 9.43663 14.2868 9.60812C14.7915 10.008 15.1693 10.5332 15.1693 11.1667C15.1693 12.0854 14.3906 12.7737 13.4715 13.2343C12.5104 13.7159 11.1966 14.0568 9.71968 14.2064C9.44495 14.2343 9.19966 14.0341 9.17182 13.7594C9.14398 13.4847 9.34412 13.2394 9.61886 13.2115C11.0173 13.0698 12.2035 12.7511 13.0235 12.3402C13.8857 11.9082 14.1693 11.4711 14.1693 11.1667C14.1693 10.962 14.0482 10.6949 13.6658 10.3919C13.4493 10.2204 13.4129 9.90595 13.5844 9.68951Z"
          fill="#1C274C"
        />
      </g>
    </svg>
  );
};
export const LocationIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8.00139 7.44455C8.39686 7.44455 8.73496 7.30372 9.0157 7.02206C9.29657 6.7404 9.437 6.40183 9.437 6.00636C9.437 5.61089 9.29617 5.27272 9.01451 4.99185C8.73284 4.71112 8.39421 4.57075 7.99861 4.57075C7.60314 4.57075 7.26504 4.71158 6.9843 4.99324C6.70343 5.27491 6.563 5.61354 6.563 6.00914C6.563 6.40461 6.70383 6.74271 6.98549 7.02345C7.26716 7.30419 7.60579 7.44455 8.00139 7.44455ZM8 15.1109C5.99947 13.3775 4.49934 11.7642 3.4996 10.2713C2.49987 8.77815 2 7.40739 2 6.15898C2 4.32459 2.59334 2.83949 3.78001 1.7037C4.96681 0.567898 6.37348 0 8 0C9.62652 0 11.0332 0.567898 12.22 1.7037C13.4067 2.83949 14 4.32459 14 6.15898C14 7.40739 13.5001 8.77815 12.5004 10.2713C11.5007 11.7642 10.0005 13.3775 8 15.1109Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const ApplyTemplates = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <path
          d="M11.0126 11.0022C11.1293 10.9112 11.2351 10.8054 11.4467 10.5937L14.085 7.95547C14.1488 7.89168 14.1196 7.78182 14.0343 7.75226C13.7229 7.64421 13.3178 7.44137 12.9389 7.06242C12.5599 6.68348 12.3571 6.27838 12.249 5.96696C12.2195 5.88174 12.1096 5.85255 12.0458 5.91633L9.40757 8.5546L9.40756 8.55461C9.19594 8.76623 9.09013 8.87204 8.99913 8.98871C8.89178 9.12634 8.79975 9.27525 8.72466 9.43281C8.661 9.56638 8.61368 9.70834 8.51904 9.99227L8.39675 10.3591L8.20229 10.9425L8.01996 11.4895C7.97339 11.6292 8.00976 11.7833 8.1139 11.8874C8.21804 11.9915 8.37209 12.0279 8.51181 11.9813L9.0588 11.799L9.64216 11.6046L10.009 11.4823L10.009 11.4823C10.293 11.3876 10.4349 11.3403 10.5685 11.2766C10.7261 11.2016 10.875 11.1095 11.0126 11.0022Z"
          fill="#1C274C"
        />
        <path
          d="M14.911 7.12942C15.4741 6.56633 15.4741 5.65338 14.911 5.09029C14.3479 4.5272 13.435 4.5272 12.8719 5.09029L12.7871 5.17511C12.7052 5.25695 12.6681 5.37128 12.6886 5.48521C12.7014 5.55688 12.7253 5.66166 12.7687 5.78669C12.8554 6.03673 13.0192 6.36496 13.3278 6.67351C13.6363 6.98207 13.9646 7.14589 14.2146 7.23264C14.3396 7.27602 14.4444 7.29986 14.5161 7.31272C14.63 7.33317 14.7443 7.29609 14.8262 7.21424L14.911 7.12942Z"
          fill="#1C274C"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M2.78105 2.11308C2 2.89413 2 4.15121 2 6.66536V9.33203C2 11.8462 2 13.1033 2.78105 13.8843C3.5621 14.6654 4.81918 14.6654 7.33333 14.6654H8.66667C11.1808 14.6654 12.4379 14.6654 13.219 13.8843C13.9875 13.1158 13.9998 11.8864 14 9.45208L12.1211 11.331C11.9413 11.5109 11.794 11.6583 11.6276 11.7881C11.4327 11.9401 11.2219 12.0704 10.9987 12.1768C10.8083 12.2675 10.6106 12.3334 10.3692 12.4137L8.82806 12.9274C8.32901 13.0938 7.7788 12.9639 7.40682 12.5919C7.03484 12.2199 6.90496 11.6697 7.07131 11.1707L7.25364 10.6237L7.57038 9.67344L7.58499 9.62957C7.66537 9.38816 7.7312 9.19044 7.82196 8.99999C7.9283 8.77686 8.05863 8.56598 8.21065 8.37108C8.3404 8.20473 8.48781 8.05742 8.66779 7.87757L11.3388 5.20662L12.08 4.46539L12.1648 4.38058C12.6417 3.90364 13.2669 3.66524 13.892 3.66537C13.7911 2.97833 13.5961 2.49021 13.219 2.11308C12.4379 1.33203 11.1808 1.33203 8.66667 1.33203H7.33333C4.81918 1.33203 3.5621 1.33203 2.78105 2.11308ZM4.83333 5.9987C4.83333 5.72256 5.05719 5.4987 5.33333 5.4987H9.66667C9.94281 5.4987 10.1667 5.72256 10.1667 5.9987C10.1667 6.27484 9.94281 6.4987 9.66667 6.4987H5.33333C5.05719 6.4987 4.83333 6.27484 4.83333 5.9987ZM4.83333 8.66536C4.83333 8.38922 5.05719 8.16536 5.33333 8.16536H7C7.27614 8.16536 7.5 8.38922 7.5 8.66536C7.5 8.94151 7.27614 9.16536 7 9.16536H5.33333C5.05719 9.16536 4.83333 8.94151 4.83333 8.66536ZM4.83333 11.332C4.83333 11.0559 5.05719 10.832 5.33333 10.832H6.33333C6.60948 10.832 6.83333 11.0559 6.83333 11.332C6.83333 11.6082 6.60948 11.832 6.33333 11.832H5.33333C5.05719 11.832 4.83333 11.6082 4.83333 11.332Z"
          fill="#1C274C"
        />
      </g>
    </svg>
  );
};
export const QuestionIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1224_84240)">
        <circle cx="8.0026" cy="7.9987" r="6.66667" stroke="#475467" strokeWidth="1.5" />
        <path
          d="M6.75 5.91797C6.75 5.22761 7.30964 4.66797 8 4.66797C8.69036 4.66797 9.25 5.22761 9.25 5.91797C9.25 6.37627 9.00336 6.77696 8.63558 6.99455C8.31869 7.18203 8 7.46645 8 7.83464V8.66797"
          stroke="#475467"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <ellipse cx="8.0026" cy="10.6667" rx="0.666667" ry="0.666667" fill="#475467" />
      </g>
      <defs>
        <clipPath id="clip0_1224_84240">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const Desktop = () => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M5.33594 11.332C3.45032 11.332 2.50751 11.332 1.92172 10.7462C1.54219 10.3667 1.40856 9.8373 1.36151 8.9987H14.6437C14.5967 9.8373 14.463 10.3667 14.0835 10.7462C13.4977 11.332 12.5549 11.332 10.6693 11.332H8.5026V13.9987H10.6693C10.9454 13.9987 11.1693 14.2226 11.1693 14.4987C11.1693 14.7748 10.9454 14.9987 10.6693 14.9987H5.33594C5.0598 14.9987 4.83594 14.7748 4.83594 14.4987C4.83594 14.2226 5.0598 13.9987 5.33594 13.9987H7.5026V11.332H5.33594Z"
          fill="#1C274C"
        />
        <path
          d="M6.66927 1.33203H9.33594C11.8501 1.33203 13.1072 1.33203 13.8882 2.11308C14.6693 2.89413 14.6693 4.15121 14.6693 6.66536V7.33203C14.6693 7.69978 14.6693 8.03166 14.6649 8.33203H1.34028C1.33594 8.03166 1.33594 7.69978 1.33594 7.33203V6.66536C1.33594 4.15121 1.33594 2.89413 2.11699 2.11308C2.89803 1.33203 4.15511 1.33203 6.66927 1.33203Z"
          fill="#1C274C"
        />
      </g>
    </svg>
  );
};
export const AlertIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M1.86719 20.5L12.0017 3L22.1362 20.5H1.86719ZM4.45169 19H19.5517L12.0017 6L4.45169 19ZM12.0017 17.8077C12.2305 17.8077 12.4224 17.7303 12.5772 17.5755C12.732 17.4207 12.8094 17.2288 12.8094 17C12.8094 16.7712 12.732 16.5793 12.5772 16.4245C12.4224 16.2697 12.2305 16.1923 12.0017 16.1923C11.7729 16.1923 11.581 16.2697 11.4262 16.4245C11.2714 16.5793 11.1939 16.7712 11.1939 17C11.1939 17.2288 11.2714 17.4207 11.4262 17.5755C11.581 17.7303 11.7729 17.8077 12.0017 17.8077ZM11.2517 15.1923H12.7517V10.1923H11.2517V15.1923Z"
        fill="#FF3B30"
      />
    </svg>
  );
};

export const ImportIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1224_72085)">
        <path d="M4 9.66797H9.33333" stroke='var(--color-ucass-active)' strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4 12H7.66667" stroke='var(--color-ucass-active)' strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M8.66406 1.66797V3.33464C8.66406 4.90598 8.66406 5.69166 9.15222 6.17981C9.64037 6.66797 10.426 6.66797 11.9974 6.66797H14.6641"
          stroke='var(--color-ucass-active)'
          strokeWidth="1.5"
        />
        <path
          d="M2.08594 6.66536C2.08594 6.25115 1.75015 5.91536 1.33594 5.91536C0.921724 5.91536 0.585938 6.25115 0.585938 6.66536H2.08594ZM13.9193 9.33203C13.9193 9.74625 14.2551 10.082 14.6693 10.082C15.0835 10.082 15.4193 9.74625 15.4193 9.33203H13.9193ZM10.2646 2.70113L9.76284 3.2586L10.2646 2.70113ZM12.9037 5.07639L12.402 5.63387L12.9037 5.07639ZM14.4386 6.7681L13.7535 7.07322V7.07323L14.4386 6.7681ZM2.11699 13.8843L2.64732 13.354H2.64732L2.11699 13.8843ZM13.8882 13.8843L13.3579 13.354L13.8882 13.8843ZM0.657201 3.92528C0.616654 4.3375 0.917957 4.70455 1.33018 4.7451C1.74241 4.78564 2.10945 4.48434 2.15 4.07212L0.657201 3.92528ZM15.348 12.0721C15.3886 11.6599 15.0873 11.2928 14.675 11.2523C14.2628 11.2118 13.8958 11.5131 13.8552 11.9253L15.348 12.0721ZM9.33594 13.9154H6.66927V15.4154H9.33594V13.9154ZM2.08594 9.33203V6.66536H0.585938V9.33203H2.08594ZM13.9193 9.04063V9.33203H15.4193V9.04063H13.9193ZM9.76284 3.2586L12.402 5.63387L13.4055 4.51892L10.7663 2.14366L9.76284 3.2586ZM15.4193 9.04063C15.4193 7.93714 15.4344 7.16056 15.1237 6.46297L13.7535 7.07323C13.9041 7.41149 13.9193 7.80465 13.9193 9.04063H15.4193ZM12.402 5.63387C13.3207 6.4607 13.6028 6.73496 13.7535 7.07322L15.1237 6.46297C14.813 5.76537 14.2257 5.25712 13.4055 4.51892L12.402 5.63387ZM6.68913 2.08203C7.76259 2.08203 8.10535 2.09361 8.40672 2.20926L8.94412 0.808828C8.32292 0.570452 7.64901 0.582031 6.68913 0.582031V2.08203ZM10.7663 2.14366C10.0562 1.50462 9.56521 1.04716 8.94412 0.808828L8.40672 2.20926C8.7082 2.32495 8.96907 2.54421 9.76284 3.2586L10.7663 2.14366ZM6.66927 13.9154C5.39099 13.9154 4.50773 13.9138 3.84315 13.8244C3.20014 13.738 2.87526 13.5819 2.64732 13.354L1.58666 14.4146C2.13976 14.9677 2.83394 15.2022 3.64328 15.311C4.43104 15.417 5.43339 15.4154 6.66927 15.4154V13.9154ZM0.585938 9.33203C0.585938 10.5679 0.584345 11.5703 0.690256 12.358C0.799069 13.1674 1.03356 13.8615 1.58666 14.4146L2.64732 13.354C2.41937 13.126 2.26333 12.8012 2.17688 12.1582C2.08753 11.4936 2.08594 10.6103 2.08594 9.33203H0.585938ZM9.33594 15.4154C10.5718 15.4154 11.5742 15.417 12.3619 15.311C13.1713 15.2022 13.8655 14.9677 14.4186 14.4146L13.3579 13.354C13.1299 13.5819 12.8051 13.738 12.1621 13.8244C11.4975 13.9138 10.6142 13.9154 9.33594 13.9154V15.4154ZM6.68913 0.582031C5.44657 0.582031 4.43949 0.580452 3.64869 0.686291C2.83687 0.794941 2.14034 1.02906 1.58666 1.58275L2.64732 2.64341C2.87468 2.41605 3.20052 2.25965 3.84767 2.17303C4.51582 2.08361 5.4043 2.08203 6.68913 2.08203V0.582031ZM2.15 4.07212C2.22878 3.27112 2.39359 2.89713 2.64732 2.64341L1.58666 1.58275C0.96947 2.19994 0.748923 2.99279 0.657201 3.92528L2.15 4.07212ZM13.8552 11.9253C13.7764 12.7263 13.6116 13.1003 13.3579 13.354L14.4186 14.4146C15.0357 13.7975 15.2563 13.0046 15.348 12.0721L13.8552 11.9253Z"
          fill='var(--color-ucass-active)'
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_72085">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const CheckCircle = ({ className }: IconProps) => {
  return (
    <svg
      width="19"
      height="21"
      viewBox="0 0 19 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        <ellipse cx="9.44254" cy="10.5979" rx="8.21597" ry="8.85571" fill="#878787" />
        <path
          d="M11.5938 10.5938C11.5938 10.875 11.5104 11.1499 11.3541 11.3837C11.1979 11.6175 10.9758 11.7998 10.716 11.9074C10.4562 12.015 10.1703 12.0432 9.89448 11.9883C9.61866 11.9334 9.36531 11.798 9.16646 11.5992C8.96761 11.4003 8.83218 11.147 8.77732 10.8711C8.72246 10.5953 8.75062 10.3094 8.85823 10.0496C8.96585 9.78981 9.1481 9.56774 9.38192 9.4115C9.61575 9.25527 9.89066 9.17188 10.1719 9.17188C10.549 9.17188 10.9106 9.32168 11.1773 9.58833C11.4439 9.85499 11.5938 10.2166 11.5938 10.5938ZM6.10938 9.17188C5.82816 9.17188 5.55325 9.25527 5.31942 9.4115C5.0856 9.56774 4.90335 9.78981 4.79573 10.0496C4.68812 10.3094 4.65996 10.5953 4.71482 10.8711C4.76968 11.147 4.90511 11.4003 5.10396 11.5992C5.30281 11.798 5.55616 11.9334 5.83198 11.9883C6.1078 12.0432 6.39369 12.015 6.6535 11.9074C6.91332 11.7998 7.13538 11.6175 7.29162 11.3837C7.44786 11.1499 7.53125 10.875 7.53125 10.5938C7.53125 10.2166 7.38145 9.85499 7.11479 9.58833C6.84814 9.32168 6.48648 9.17188 6.10938 9.17188ZM14.2344 9.17188C13.9532 9.17188 13.6783 9.25527 13.4444 9.4115C13.2106 9.56774 13.0284 9.78981 12.9207 10.0496C12.8131 10.3094 12.785 10.5953 12.8398 10.8711C12.8947 11.147 13.0301 11.4003 13.229 11.5992C13.4278 11.798 13.6812 11.9334 13.957 11.9883C14.2328 12.0432 14.5187 12.015 14.7785 11.9074C15.0383 11.7998 15.2604 11.6175 15.4166 11.3837C15.5729 11.1499 15.6563 10.875 15.6563 10.5938C15.6563 10.407 15.6195 10.2221 15.548 10.0496C15.4766 9.87711 15.3718 9.72037 15.2398 9.58833C15.1078 9.4563 14.951 9.35156 14.7785 9.28011C14.606 9.20865 14.4211 9.17188 14.2344 9.17188Z"
          fill="white"
        />
      </g>
    </svg>
  );
};
export const NotFound = ({ className }: IconProps) => {
  return (
    <svg
      width="62"
      height="51"
      viewBox="0 0 62 51"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_2093_96580)">
        <path
          d="M54.7181 30.9169C55.428 29.4128 55.8037 27.7617 55.8037 26.0877C55.8037 20.3075 51.447 15.5254 45.8447 14.8533V14.8416C45.8447 6.65818 39.1871 0 31.0031 0C22.8191 0 16.1609 6.65756 16.1609 14.8416V14.854C10.5592 15.5267 6.20312 20.3081 6.20312 26.0877C6.20312 32.3268 11.2791 37.4027 17.5181 37.4027H29.1245C29.1878 44.8446 35.2582 50.8791 42.7143 50.8791C50.2095 50.8791 56.3072 44.7814 56.3072 37.2862C56.3072 34.986 55.7312 32.8185 54.7181 30.9169ZM17.5187 34.3027C12.989 34.3027 9.30374 30.6175 9.30374 26.0877C9.30374 21.558 12.989 17.8727 17.5187 17.8727H19.5269L19.3391 16.1541C19.2864 15.6755 19.2609 15.2458 19.2609 14.8422C19.2609 8.36814 24.5285 3.10062 31.0031 3.10062C37.4772 3.10062 42.7447 8.36752 42.7447 14.8422C42.7447 15.2563 42.7193 15.6841 42.6672 16.1504L42.4737 17.8727H44.4894C49.0185 17.8727 52.7031 21.558 52.7031 26.0877C52.7031 26.6904 52.6331 27.2881 52.5041 27.8709C50.0297 25.2991 46.5564 23.6939 42.7143 23.6939C36.244 23.6939 30.819 28.2391 29.4556 34.3027H17.5187ZM42.7143 47.7791C36.9285 47.7791 32.2214 43.072 32.2214 37.2862C32.2214 31.5003 36.9285 26.7933 42.7143 26.7933C48.5001 26.7933 53.2072 31.5003 53.2072 37.2862C53.2072 43.072 48.5001 47.7791 42.7143 47.7791ZM42.7143 29.9627C41.8581 29.9627 41.1643 30.6565 41.1643 31.5127V37.9192C41.1643 38.7754 41.8581 39.4692 42.7143 39.4692C43.5705 39.4692 44.2643 38.7754 44.2643 37.9192V31.5127C44.2643 30.6565 43.5705 29.9627 42.7143 29.9627ZM42.7143 41.0192C41.8581 41.0192 41.1643 41.713 41.1643 42.5692V42.6727C41.1643 43.529 41.8581 44.2227 42.7143 44.2227C43.5705 44.2227 44.2643 43.529 44.2643 42.6727V42.5692C44.2643 41.713 43.5705 41.0192 42.7143 41.0192Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_2093_96580">
          <rect width="62" height="50.84" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const EclipseLine = ({ className }: IconProps) => {
  return (
    <svg
      width="75"
      height="12"
      viewBox="0 0 75 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="0.226562" y="2.45703" width="68.5127" height="7.16" rx="3.58" fill='var(--color-ucass-active)' />
      <circle cx="69.187" cy="6.03857" r="5.45654" fill="white" />
    </svg>
  );
};

export const PauseMusic = ({ className }: IconProps) => {
  return (
    <svg
      width="54"
      height="48"
      viewBox="0 0 54 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_dddd_1747_75597)">
        <circle cx="27" cy="21" r="20" fill='var(--color-ucass-active)' />
      </g>
      <path d="M21 27V15H33V27H21Z" fill="white" />
      <defs>
        <filter
          id="filter0_dddd_1747_75597"
          x="0"
          y="0"
          width="54"
          height="66"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.623529 0 0 0 0 0.788235 0 0 0 0.1 0"
          />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1747_75597" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="4" />
          <feGaussianBlur stdDeviation="2" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.623529 0 0 0 0 0.788235 0 0 0 0.09 0"
          />
          <feBlend
            mode="normal"
            in2="effect1_dropShadow_1747_75597"
            result="effect2_dropShadow_1747_75597"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="10" />
          <feGaussianBlur stdDeviation="3" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.623529 0 0 0 0 0.788235 0 0 0 0.05 0"
          />
          <feBlend
            mode="normal"
            in2="effect2_dropShadow_1747_75597"
            result="effect3_dropShadow_1747_75597"
          />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="18" />
          <feGaussianBlur stdDeviation="3.5" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0.623529 0 0 0 0 0.788235 0 0 0 0.01 0"
          />
          <feBlend
            mode="normal"
            in2="effect3_dropShadow_1747_75597"
            result="effect4_dropShadow_1747_75597"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect4_dropShadow_1747_75597"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  );
};

export const TimerIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7.99238 12.834C7.19933 12.834 6.44127 12.6823 5.7182 12.379C5.02622 12.0834 4.41005 11.6654 3.86969 11.1248C3.32933 10.5843 2.91142 9.96787 2.61597 9.27565C2.31275 8.55232 2.16113 7.79398 2.16113 7.00065C2.16113 6.20732 2.31275 5.44898 2.61597 4.72565C2.91142 4.03343 3.32933 3.41704 3.86969 2.87648C4.41005 2.33593 5.02622 1.91787 5.7182 1.62232C6.44127 1.31898 7.19933 1.16732 7.99238 1.16732C8.78543 1.16732 9.5435 1.31898 10.2666 1.62232C10.9585 1.91787 11.5747 2.33593 12.1151 2.87648C12.6554 3.41704 13.0733 4.03343 13.3688 4.72565C13.672 5.44898 13.8236 6.20732 13.8236 7.00065C13.8236 7.79398 13.672 8.55232 13.3688 9.27565C13.0733 9.96787 12.6554 10.5843 12.1151 11.1248C11.5747 11.6654 10.9585 12.0834 10.2666 12.379C9.5435 12.6823 8.78543 12.834 7.99238 12.834ZM7.99238 11.6673C8.83986 11.6673 9.62513 11.4534 10.3482 11.0257C11.048 10.6134 11.6039 10.0573 12.0159 9.35732C12.4436 8.63398 12.6574 7.84843 12.6574 7.00065C12.6574 6.15287 12.4436 5.36732 12.0159 4.64398C11.6039 3.94398 11.048 3.38787 10.3482 2.97565C9.62513 2.54787 8.83986 2.33398 7.99238 2.33398C7.14491 2.33398 6.35963 2.54787 5.63656 2.97565C4.93681 3.38787 4.3809 3.94398 3.96882 4.64398C3.5412 5.36732 3.32738 6.15287 3.32738 7.00065C3.32738 7.84843 3.5412 8.63398 3.96882 9.35732C4.3809 10.0573 4.93681 10.6134 5.63656 11.0257C6.35963 11.4534 7.14491 11.6673 7.99238 11.6673ZM8.57551 7.00065H10.908V8.16732H7.40926V4.08398H8.57551V7.00065Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const Cut = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
    >
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
      <line x1="18" y1="9" x2="12" y2="15"></line>
      <line x1="12" y1="9" x2="18" y2="15"></line>
    </svg>
  );
};
export const EditLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <path
        d="M15.75 9.00044C15.5511 9.00044 15.3603 9.07946 15.2197 9.22011C15.079 9.36077 15 9.55153 15 9.75044V14.2504C15 14.4494 14.921 14.6401 14.7803 14.7808C14.6397 14.9214 14.4489 15.0004 14.25 15.0004H3.75C3.55109 15.0004 3.36032 14.9214 3.21967 14.7808C3.07902 14.6401 3 14.4494 3 14.2504V3.75044C3 3.55153 3.07902 3.36076 3.21967 3.22011C3.36032 3.07946 3.55109 3.00044 3.75 3.00044H8.25C8.44891 3.00044 8.63968 2.92142 8.78033 2.78077C8.92098 2.64012 9 2.44935 9 2.25044C9 2.05153 8.92098 1.86076 8.78033 1.72011C8.63968 1.57946 8.44891 1.50044 8.25 1.50044H3.75C3.15326 1.50044 2.58097 1.7375 2.15901 2.15945C1.73705 2.58141 1.5 3.15371 1.5 3.75044V14.2504C1.5 14.8472 1.73705 15.4195 2.15901 15.8414C2.58097 16.2634 3.15326 16.5004 3.75 16.5004H14.25C14.8467 16.5004 15.419 16.2634 15.841 15.8414C16.2629 15.4195 16.5 14.8472 16.5 14.2504V9.75044C16.5 9.55153 16.421 9.36077 16.2803 9.22011C16.1397 9.07946 15.9489 9.00044 15.75 9.00044ZM4.5 9.57044V12.7504C4.5 12.9494 4.57902 13.1401 4.71967 13.2808C4.86032 13.4214 5.05109 13.5004 5.25 13.5004H8.43C8.52871 13.501 8.62655 13.4821 8.71793 13.4448C8.80931 13.4074 8.89242 13.3525 8.9625 13.2829L14.1525 8.08544L16.2825 6.00044C16.3528 5.93072 16.4086 5.84777 16.4467 5.75638C16.4847 5.66498 16.5043 5.56695 16.5043 5.46794C16.5043 5.36893 16.4847 5.2709 16.4467 5.17951C16.4086 5.08812 16.3528 5.00516 16.2825 4.93544L13.1025 1.71794C13.0328 1.64765 12.9498 1.59185 12.8584 1.55377C12.767 1.5157 12.669 1.49609 12.57 1.49609C12.471 1.49609 12.373 1.5157 12.2816 1.55377C12.1902 1.59185 12.1072 1.64765 12.0375 1.71794L9.9225 3.84044L4.7175 9.03794C4.64799 9.10802 4.593 9.19114 4.55567 9.28251C4.51835 9.37389 4.49943 9.47174 4.5 9.57044ZM12.57 3.30794L14.6925 5.43044L13.6275 6.49544L11.505 4.37294L12.57 3.30794ZM6 9.87794L10.4475 5.43044L12.57 7.55294L8.1225 12.0004H6V9.87794Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const TrashLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className}>
      <path
        d="M12 6.75V14.25H6V6.75H12ZM10.875 2.25H7.125L6.375 3H3.75V4.5H14.25V3H11.625L10.875 2.25ZM13.5 5.25H4.5V14.25C4.5 15.075 5.175 15.75 6 15.75H12C12.825 15.75 13.5 15.075 13.5 14.25V5.25Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UploadLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path d="M11 15h2V9h3l-4-5-4 5h3z" fill="currentColor"></path>
      <path
        d="M20 18H4v-7H2v7c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2v-7h-2v7z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const VoicemailLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" className={className}>
      <path
        fill="currentColor"
        d="M17.5 8a4.505 4.505 0 0 0-4.5 4.5c0 .925.281 1.784.762 2.5h-3.523c.48-.716.761-1.575.761-2.5C11 10.019 8.981 8 6.5 8S2 10.019 2 12.5 4.019 17 6.5 17c.171 0 .334-.032.5-.051V17h11v-.051c2.244-.252 4-2.139 4-4.449 0-2.481-2.019-4.5-4.5-4.5zM4 12.5C4 11.121 5.121 10 6.5 10S9 11.121 9 12.5 7.879 15 6.5 15 4 13.879 4 12.5zM17.5 15c-1.379 0-2.5-1.121-2.5-2.5s1.121-2.5 2.5-2.5 2.5 1.121 2.5 2.5-1.121 2.5-2.5 2.5z"
      ></path>
    </svg>
  );
};
export const DragLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="7" height="6" viewBox="0 0 7 6" fill="none" className={className}>
      <path
        d="M0.375 2.04847V0.740945H6.74361V2.04847H0.375ZM0.375 5.11097V3.80344H6.74361V5.11097H0.375Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const TranscriptLineIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.002 19C15.312 19 18.002 16.31 18.002 13V8C18.002 4.69 15.312 2 12.002 2C8.69195 2 6.00195 4.69 6.00195 8V13C6.00195 16.31 8.69195 19 12.002 19Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.00195 11V13C3.00195 17.97 7.03195 22 12.002 22C16.972 22 21.002 17.97 21.002 13V11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        stroke-strokelinejoin="round"
      />
      <path
        d="M9.1123 7.47993C10.8923 6.82993 12.8323 6.82993 14.6123 7.47993"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.0322 10.4799C11.2322 10.1499 12.5022 10.1499 13.7022 10.4799"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const ForwardLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M12.2229 4.5653L15.5332 7.50774C16.8403 8.66969 17.4939 9.25066 17.4939 9.99911C17.4939 10.7476 16.8403 11.3285 15.5332 12.4905L12.2229 15.4329C11.6262 15.9633 11.3279 16.2285 11.0819 16.118C10.8359 16.0076 10.8359 15.6084 10.8359 14.8101V12.8562C7.83594 12.8562 4.58594 14.2848 3.33594 16.6658C3.33594 9.04673 7.78038 7.14196 10.8359 7.14196V5.18814C10.8359 4.38982 10.8359 3.99065 11.0819 3.88019C11.3279 3.76973 11.6262 4.03492 12.2229 4.5653Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
export const ChecksLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.0261 8.03594L5.62605 16.2859C5.48577 16.4239 5.29688 16.5013 5.10011 16.5013C4.90334 16.5013 4.71445 16.4239 4.57417 16.2859L0.974175 12.7506C0.903938 12.6816 0.847993 12.5993 0.809533 12.5087C0.771074 12.418 0.750853 12.3206 0.750026 12.2221C0.749199 12.1236 0.767782 12.0259 0.804713 11.9346C0.841645 11.8432 0.896201 11.7601 0.965268 11.6898C1.03434 11.6196 1.11656 11.5637 1.20725 11.5252C1.29794 11.4867 1.39531 11.4665 1.49381 11.4657C1.59232 11.4649 1.69002 11.4835 1.78134 11.5204C1.87266 11.5573 1.95581 11.6119 2.02605 11.6809L5.10011 14.6997L12.9751 6.96532C13.1171 6.82583 13.3087 6.74846 13.5077 6.75021C13.6062 6.75109 13.7036 6.77136 13.7943 6.80987C13.8851 6.84839 13.9673 6.9044 14.0364 6.97469C14.1054 7.04499 14.16 7.12821 14.1969 7.21958C14.2338 7.31096 14.2523 7.40871 14.2515 7.50726C14.2506 7.60581 14.2303 7.70322 14.1918 7.79393C14.1533 7.88464 14.0973 7.96688 14.027 8.03594H14.0261ZM23.0354 6.97469C22.9664 6.90434 22.8842 6.84829 22.7934 6.80974C22.7027 6.77119 22.6053 6.7509 22.5067 6.75003C22.4082 6.74916 22.3104 6.76772 22.219 6.80467C22.1276 6.84161 22.0444 6.8962 21.9742 6.96532L14.0992 14.6997L12.3339 12.9653C12.1919 12.826 12.0004 12.7487 11.8014 12.7505C11.6025 12.7524 11.4124 12.8332 11.2731 12.9752C11.1337 13.1171 11.0565 13.3087 11.0583 13.5076C11.0602 13.7065 11.141 13.8966 11.2829 14.0359L13.5732 16.2859C13.7135 16.4239 13.9024 16.5013 14.0992 16.5013C14.2959 16.5013 14.4848 16.4239 14.6251 16.2859L23.0251 8.03594C23.0955 7.96697 23.1517 7.88479 23.1903 7.79411C23.2289 7.70343 23.2493 7.60602 23.2502 7.50746C23.2512 7.40889 23.2327 7.31111 23.1959 7.21969C23.159 7.12828 23.1045 7.04502 23.0354 6.97469Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PhoneLine = ({ className }: IconProps) => {
  return (
    <svg width="66" height="69" viewBox="0 0 66 69" fill="none" className={className}>
      <g opacity="1">
        <path
          d="M44.277 38.4072L43.7365 37.8872L43.7365 37.8872L44.277 38.4072ZM45.5294 37.1052L46.0699 37.6252L46.0699 37.6252L45.5294 37.1052ZM52.1753 36.1946L51.8047 36.8466L51.8047 36.8466L52.1753 36.1946ZM57.4291 39.1805L57.0586 39.8325L57.4291 39.1805ZM58.9096 48.5385L59.4501 49.0585L59.4501 49.0585L58.9096 48.5385ZM55.0031 52.5994L54.4626 52.0795L54.4626 52.0795L55.0031 52.5994ZM51.3598 54.5248L51.4325 55.2713L51.4325 55.2713L51.3598 54.5248ZM24.2422 42.3389L24.7827 41.8189L24.2422 42.3389ZM11.0079 16.5186L10.259 16.5593L10.259 16.5593L11.0079 16.5186ZM28.8132 20.6925L29.3537 21.2124L29.3537 21.2124L28.8132 20.6925ZM29.2442 13.0625L29.8539 12.6259L29.8539 12.6259L29.2442 13.0625ZM25.7765 8.21986L25.1667 8.65651L25.1667 8.65651L25.7765 8.21986ZM17.219 7.40263L17.7595 7.92259L17.7595 7.92259L17.219 7.40263ZM12.9026 11.8896L12.3621 11.3697L12.3621 11.3697L12.9026 11.8896ZM33.1736 33.0546L33.7141 32.5346L33.1736 33.0546ZM44.8175 38.9272L46.0699 37.6252L44.9889 36.5853L43.7365 37.8872L44.8175 38.9272ZM51.8047 36.8466L57.0586 39.8325L57.7997 38.5284L52.5458 35.5425L51.8047 36.8466ZM58.3691 48.0186L54.4626 52.0795L55.5436 53.1194L59.4501 49.0585L58.3691 48.0186ZM51.287 53.7783C46.9971 54.1964 36.2781 53.7685 24.7827 41.8189L23.7017 42.8588C35.5637 55.1895 46.7605 55.7266 51.4325 55.2713L51.287 53.7783ZM24.7827 41.8189C13.8996 30.5057 11.9954 20.866 11.7568 16.4779L10.259 16.5593C10.5163 21.292 12.5593 31.2761 23.7017 42.8588L24.7827 41.8189ZM28.5649 22.0323L29.3537 21.2124L28.2727 20.1725L27.4839 20.9924L28.5649 22.0323ZM29.8539 12.6259L26.3862 7.78321L25.1667 8.65651L28.6344 13.4992L29.8539 12.6259ZM16.6785 6.88268L12.3621 11.3697L13.4431 12.4096L17.7595 7.92259L16.6785 6.88268ZM28.0244 21.5124C27.4839 20.9924 27.4832 20.9932 27.4825 20.9939C27.4823 20.9942 27.4815 20.9949 27.481 20.9955C27.48 20.9965 27.4789 20.9977 27.4778 20.9988C27.4756 21.0012 27.4732 21.0037 27.4707 21.0065C27.4656 21.0121 27.4598 21.0185 27.4533 21.0258C27.4405 21.0404 27.4251 21.0585 27.4078 21.0801C27.373 21.1235 27.3301 21.1812 27.283 21.254C27.1886 21.3997 27.0775 21.6048 26.9807 21.8737C26.7852 22.416 26.6564 23.1923 26.8098 24.2258C27.114 26.276 28.5202 29.2991 32.6331 33.5745L33.7141 32.5346C29.7007 28.3626 28.5323 25.6146 28.2935 24.0056C28.1754 23.2095 28.283 22.6841 28.3918 22.3822C28.4471 22.2289 28.5051 22.1263 28.5418 22.0698C28.5602 22.0414 28.5733 22.0244 28.5782 22.0183C28.5806 22.0152 28.581 22.0149 28.5789 22.0173C28.5779 22.0184 28.5762 22.0203 28.5739 22.0228C28.5728 22.0241 28.5714 22.0255 28.57 22.0271C28.5692 22.0279 28.5684 22.0287 28.5676 22.0296C28.5672 22.03 28.5665 22.0307 28.5663 22.0309C28.5656 22.0316 28.5649 22.0323 28.0244 21.5124ZM32.6331 33.5745C36.7425 37.8464 39.6587 39.3193 41.6539 39.6392C42.6625 39.8009 43.4237 39.6653 43.957 39.4576C44.2207 39.355 44.4214 39.2375 44.5634 39.138C44.6343 39.0883 44.6905 39.0433 44.7326 39.0068C44.7536 38.9886 44.7712 38.9725 44.7853 38.9591C44.7923 38.9523 44.7985 38.9463 44.8039 38.941C44.8066 38.9383 44.809 38.9358 44.8113 38.9335C44.8124 38.9323 44.8135 38.9312 44.8145 38.9302C44.8151 38.9297 44.8158 38.9289 44.816 38.9286C44.8168 38.9279 44.8175 38.9272 44.277 38.4072C43.7365 37.8872 43.7371 37.8865 43.7378 37.8858C43.738 37.8856 43.7387 37.8849 43.7391 37.8845C43.74 37.8836 43.7408 37.8828 43.7415 37.882C43.7431 37.8805 43.7444 37.8791 43.7457 37.8779C43.7481 37.8754 43.7499 37.8737 43.7511 37.8726C43.7534 37.8703 43.7533 37.8706 43.7505 37.873C43.745 37.8777 43.7293 37.8909 43.7029 37.9093C43.6504 37.9461 43.5551 38.0044 43.4126 38.0599C43.1338 38.1685 42.6428 38.2786 41.8914 38.1581C40.3664 37.9136 37.7309 36.7102 33.7141 32.5346L32.6331 33.5745ZM26.3862 7.78321C24.0361 4.5012 19.4331 4.01918 16.6785 6.88268L17.7595 7.92259C19.8147 5.78621 23.3205 6.07832 25.1667 8.65651L26.3862 7.78321ZM11.7568 16.4779C11.6741 14.9562 12.3533 13.5424 13.4431 12.4096L12.3621 11.3697C11.067 12.7159 10.148 14.516 10.259 16.5593L11.7568 16.4779ZM54.4626 52.0795C53.5524 53.0256 52.4755 53.6625 51.287 53.7783L51.4325 55.2713C53.0787 55.1108 54.4671 54.2384 55.5436 53.1194L54.4626 52.0795ZM29.3537 21.2124C31.5615 18.9174 31.7475 15.2702 29.8539 12.6259L28.6344 13.4992C30.1313 15.5896 29.9509 18.428 28.2727 20.1725L29.3537 21.2124ZM57.0586 39.8325C60.0255 41.5187 60.6523 45.6451 58.3691 48.0186L59.4501 49.0585C62.4407 45.9497 61.5806 40.6772 57.7997 38.5284L57.0586 39.8325ZM46.0699 37.6252C47.5568 36.0796 49.8789 35.7521 51.8047 36.8466L52.5458 35.5425C50.041 34.1189 46.965 34.5312 44.9889 36.5853L46.0699 37.6252Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={2}
        />
      </g>
    </svg>
  );
};
export const AddCircleLine = ({ className }: IconProps) => {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <g clipPath="url(#clip0_2306_95988)">
        <path
          d="M8.50065 9.99935C8.50065 10.2755 8.27679 10.4993 8.00065 10.4993C7.72451 10.4993 7.50065 10.2755 7.50065 9.99935L7.50065 8.49933H6.00065C5.72451 8.49933 5.50065 8.27547 5.50065 7.99933C5.50065 7.72319 5.72451 7.49933 6.00065 7.49933H7.50065V5.99935C7.50065 5.72321 7.72451 5.49935 8.00065 5.49935C8.27679 5.49935 8.50065 5.72321 8.50065 5.99935L8.50065 7.49933H10.0007C10.2768 7.49933 10.5007 7.72319 10.5007 7.99933C10.5007 8.27548 10.2768 8.49933 10.0007 8.49933H8.50065V9.99935Z"
          fill="currentColor"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8.00065 15.166C4.04261 15.166 0.833984 11.9574 0.833984 7.99935C0.833984 4.04131 4.04261 0.832682 8.00065 0.832682C11.9587 0.832682 15.1673 4.04131 15.1673 7.99935C15.1673 11.9574 11.9587 15.166 8.00065 15.166ZM1.83398 7.99935C1.83398 11.4051 4.5949 14.166 8.00065 14.166C11.4064 14.166 14.1673 11.4051 14.1673 7.99935C14.1673 4.59359 11.4064 1.83268 8.00065 1.83268C4.5949 1.83268 1.83398 4.59359 1.83398 7.99935Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_2306_95988">
          <rect width="16" height="16" fill="white" transform="matrix(1 0 0 -1 0 16)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const CallForwardLine = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="1 1 22 22"
    >
      <path d="M14 6h8"></path>
      <path d="m18 2 4 4-4 4"></path>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
    </svg>
  );
};
export const DoNotDisturbLine = ({ className }: IconProps) => {
  return (
    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_95094)">
        <mask id="mask0_1224_95094" maskUnits="userSpaceOnUse" x="7" y="6" width="11" height="13">
          <path
            d="M7.91406 14.4258H17.2474V17.6758C17.2474 17.8194 17.1859 17.9572 17.0765 18.0588C16.9671 18.1604 16.8188 18.2174 16.6641 18.2174H8.4974C8.34269 18.2174 8.19431 18.1604 8.08492 18.0588C7.97552 17.9572 7.91406 17.8194 7.91406 17.6758V14.4258Z"
            fill="white"
            stroke="white"
            strokeLinejoin="round"
          />
          <path
            d="M17.2474 14.4245V7.92448C17.2474 7.78082 17.1859 7.64305 17.0765 7.54146C16.9671 7.43988 16.8188 7.38281 16.6641 7.38281H8.4974C8.34269 7.38281 8.19431 7.43988 8.08492 7.54146C7.97552 7.64305 7.91406 7.78082 7.91406 7.92448V14.4245"
            stroke="white"
            strokeLinejoin="round"
          />
          <path d="M12 16.3203H13.1667" stroke="black" strokeLinecap="round" />
        </mask>
        <g mask="url(#mask0_1224_95094)">
          <path d="M5.57812 6.30078H19.5781V19.3008H5.57812V6.30078Z" fill="black" />
        </g>
      </g>
      <path
        d="M12.5781 2.80078C7.07812 2.80078 2.57812 7.30078 2.57812 12.8008C2.57812 18.3008 7.07812 22.8008 12.5781 22.8008C18.0781 22.8008 22.5781 18.3008 22.5781 12.8008C22.5781 7.30078 18.0781 2.80078 12.5781 2.80078ZM4.57812 12.8008C4.57812 8.40078 8.17812 4.80078 12.5781 4.80078C14.3781 4.80078 16.0781 5.40078 17.4781 6.50078L6.27812 17.7008C5.17812 16.3008 4.57812 14.6008 4.57812 12.8008ZM12.5781 20.8008C10.7781 20.8008 9.07812 20.2008 7.67812 19.1008L18.8781 7.90078C19.9781 9.30078 20.5781 11.0008 20.5781 12.8008C20.5781 17.2008 16.9781 20.8008 12.5781 20.8008Z"
        fill="currentColor"
      />
      <defs>
        <clipPath id="clip0_1224_95094">
          <rect width="14" height="13" fill="white" transform="translate(5.57812 6.30078)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const PhoneBookLine = ({ className }: IconProps) => {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_95126)">
        <path
          d="M4.10938 8.75C4.10938 5.45038 4.10937 3.80012 5.13487 2.7755C6.16037 1.75087 7.80975 1.75 11.1094 1.75H12.4219C15.7215 1.75 17.3717 1.75 18.3964 2.7755C19.421 3.801 19.4219 5.45038 19.4219 8.75V12.25C19.4219 15.5496 19.4219 17.1999 18.3964 18.2245C17.3709 19.2491 15.7215 19.25 12.4219 19.25H11.1094C7.80975 19.25 6.1595 19.25 5.13487 18.2245C4.11025 17.199 4.10938 15.5496 4.10938 12.25V8.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.18438 10.4772C8.81075 9.82625 8.6305 9.29512 8.522 8.75612C8.361 7.95987 8.72937 7.18112 9.33837 6.68412C9.5965 6.47412 9.89137 6.54588 10.0436 6.81975L10.3875 7.43662C10.6596 7.92487 10.7961 8.16988 10.769 8.42888C10.7428 8.68788 10.559 8.89875 10.1915 9.32137L9.18438 10.4772ZM9.18438 10.4772C9.97197 11.8268 11.095 12.9499 12.4446 13.7375M12.4446 13.7375C13.0956 14.1111 13.6268 14.2914 14.1658 14.3999C14.962 14.5609 15.7408 14.1925 16.2378 13.5835C16.4478 13.3254 16.376 13.0305 16.1021 12.8783L15.4861 12.5344C14.9961 12.2622 14.752 12.1257 14.493 12.1529C14.234 12.1791 14.0231 12.3629 13.6005 12.7304L12.4446 13.7375ZM4.98438 5.25H2.79688M4.98438 10.5H2.79688M4.98438 15.75H2.79688"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_95126">
          <rect width="20" height="20" fill="white" transform="translate(0.609375 0.59375)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const TimerLineIcon = ({ className }: IconProps) => {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" className={className}>
      <g clipPath="url(#clip0_1224_95136)">
        <path
          d="M9.8776 16.2839C10.7148 16.2839 11.5438 16.119 12.3172 15.7986C13.0907 15.4782 13.7934 15.0086 14.3854 14.4167C14.9774 13.8247 15.447 13.1219 15.7673 12.3485C16.0877 11.575 16.2526 10.746 16.2526 9.90885C16.2526 9.07168 16.0877 8.2427 15.7673 7.46925C15.447 6.6958 14.9774 5.99302 14.3854 5.40105C13.7934 4.80907 13.0907 4.3395 12.3172 4.01912C11.5438 3.69875 10.7148 3.53385 9.8776 3.53385C8.18685 3.53385 6.56534 4.2055 5.3698 5.40105C4.17425 6.59659 3.5026 8.2181 3.5026 9.90885C3.5026 11.5996 4.17425 13.2211 5.3698 14.4167C6.56534 15.6122 8.18685 16.2839 9.8776 16.2839ZM17.6693 9.90885C17.6693 14.212 14.1807 17.7005 9.8776 17.7005C5.57448 17.7005 2.08594 14.212 2.08594 9.90885C2.08594 5.60573 5.57448 2.11719 9.8776 2.11719C14.1807 2.11719 17.6693 5.60573 17.6693 9.90885ZM12.0026 13.0354L9.16927 10.2021V5.30469H10.5859V9.6156L13.0042 12.0339L12.0026 13.0354Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1224_95136">
          <rect width="18" height="18" fill="white" transform="translate(0.375 0.410156)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const AttachLine = ({ className }: IconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className={className}>
      <path
        d="M7.18281 6.89732V11.3926C7.18801 11.7213 7.32223 12.0348 7.55653 12.2655C7.79082 12.4961 8.1064 12.6253 8.43516 12.6253C8.76391 12.6253 9.07949 12.4961 9.31378 12.2655C9.54808 12.0348 9.68231 11.7213 9.6875 11.3926L9.69156 5.50045C9.69497 5.21949 9.64258 4.94064 9.53742 4.68008C9.43226 4.41952 9.27642 4.18243 9.07895 3.98255C8.88148 3.78266 8.64629 3.62396 8.38702 3.51565C8.12776 3.40734 7.84957 3.35156 7.56859 3.35156C7.28761 3.35156 7.00943 3.40734 6.75016 3.51565C6.4909 3.62396 6.25571 3.78266 6.05824 3.98255C5.86076 4.18243 5.70493 4.41952 5.59977 4.68008C5.49461 4.94064 5.44222 5.21949 5.44563 5.50045V11.4323C5.4399 11.8279 5.51286 12.2206 5.66027 12.5877C5.80768 12.9548 6.0266 13.2889 6.30429 13.5707C6.58198 13.8524 6.91291 14.0761 7.27784 14.2289C7.64277 14.3816 8.03441 14.4602 8.43 14.4602C8.82559 14.4602 9.21723 14.3816 9.58216 14.2289C9.94708 14.0761 10.278 13.8524 10.5557 13.5707C10.8334 13.2889 11.0523 12.9548 11.1997 12.5877C11.3471 12.2206 11.4201 11.8279 11.4144 11.4323V5.8892"
        stroke="currentColor"
        stroke-miterlimit="10"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const SMSIncoming = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.58333 9.21479L3.08333 5.38938V12.8269C3.08333 12.9017 3.10736 12.9632 3.15542 13.0113C3.20347 13.0593 3.26493 13.0833 3.33979 13.0833H11.2917V14.1667H3.33979C2.96465 14.1667 2.64757 14.0371 2.38854 13.7779C2.12951 13.5187 2 13.2015 2 12.826V4.33396C2 3.95854 2.12951 3.64236 2.38854 3.38542C2.64757 3.12847 2.96465 3 3.33979 3H15.8269C16.202 3 16.5191 3.12951 16.7781 3.38854C17.0372 3.64757 17.1667 3.96465 17.1667 4.33979V9.79167H16.0833V5.38938L9.58333 9.21479ZM9.58333 7.8125L15.9552 4.08333H3.21146L9.58333 7.8125ZM3.08333 5.38938V13.6554V9.58333V9.62333V4.08333V5.38938Z"
        fill="#101828"
      />
      <path
        d="M16.445 14.9931L16.2228 16.0534L12.4807 15.2694L13.2647 11.5273L14.325 11.7494L13.9203 13.6815L16.7843 11.8097L17.377 12.7165L14.5196 14.584L16.445 14.9931Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SMSOutgoing = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M9.58333 9.21479L3.08333 5.38938V12.8269C3.08333 12.9017 3.10736 12.9632 3.15542 13.0113C3.20347 13.0593 3.26493 13.0833 3.33979 13.0833H11.2917V14.1667H3.33979C2.96465 14.1667 2.64757 14.0371 2.38854 13.7779C2.12951 13.5187 2 13.2015 2 12.826V4.33396C2 3.95854 2.12951 3.64236 2.38854 3.38542C2.64757 3.12847 2.96465 3 3.33979 3H15.8269C16.202 3 16.5191 3.12951 16.7781 3.38854C17.0372 3.64757 17.1667 3.96465 17.1667 4.33979V9.79167H16.0833V5.38938L9.58333 9.21479ZM9.58333 7.8125L15.9552 4.08333H3.21146L9.58333 7.8125ZM15.4231 16.3285L14.6571 15.5625L16.045 14.1667H12.6315V13.0833H16.0529L14.6571 11.6875L15.4231 10.9215L18.1267 13.625L15.4231 16.3285ZM3.08333 5.38938V13.6554V9.58333V9.62333V4.08333V5.38938Z"
        fill="#101828"
      />
      <rect x="12" y="10" width="7" height="7" fill="white" />
      <path
        d="M14.8505 11.68L15.6675 10.903L18.513 13.6844L15.6297 16.4265L14.8234 15.6384L16.3121 14.2227L12.687 14.1978L12.6946 13.0912L16.3113 13.116L14.8505 11.68Z"
        fill='var(--color-ucass-active)'
      />
    </svg>
  );
};
export const FaxIncoming = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g clipPath="url(#clip0_5480_100310)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.96538 3.73047H10.0294C10.8272 3.73046 11.4702 3.73045 11.9759 3.79844C12.501 3.86903 12.9431 4.02006 13.2942 4.37117C13.7258 4.80283 13.8593 5.37848 13.9064 6.09263C14.0494 6.10218 14.1835 6.11487 14.3093 6.13177C14.8343 6.20237 15.2764 6.35339 15.6275 6.70451C15.9786 7.05562 16.1297 7.49772 16.2003 8.02278C16.2683 8.52851 16.2682 9.17153 16.2682 9.9693V10.0333C16.2682 10.8311 16.2683 11.4741 16.2003 11.9798C16.1297 12.5049 15.9786 12.947 15.6275 13.2981C15.1959 13.7298 14.6202 13.8632 13.9061 13.9103C13.8965 14.0533 13.8838 14.1875 13.8669 14.3132C13.7963 14.8382 13.6453 15.2803 13.2942 15.6314C12.9431 15.9826 12.501 16.1336 11.9759 16.2042C11.4702 16.2722 10.8272 16.2721 10.0294 16.2721H9.96539C9.16763 16.2721 8.52461 16.2722 8.01887 16.2042C7.49381 16.1336 7.05172 15.9826 6.7006 15.6314C6.34948 15.2803 6.19846 14.8382 6.12787 14.3132C6.11097 14.1875 6.09827 14.0533 6.08873 13.9103C5.37458 13.8632 4.79892 13.7298 4.36727 13.2981C4.01615 12.947 3.86513 12.5049 3.79453 11.9798C3.72654 11.4741 3.72655 10.8311 3.72656 10.0333V9.96929C3.72655 9.17153 3.72654 8.52851 3.79453 8.02278C3.86513 7.49772 4.01615 7.05562 4.36727 6.70451C4.71838 6.35339 5.16048 6.20237 5.68554 6.13177C5.81124 6.11487 5.94543 6.10218 6.08836 6.09263C6.13545 5.37848 6.26894 4.80283 6.7006 4.37117C7.05172 4.02006 7.49381 3.86903 8.01887 3.79844C8.5246 3.73045 9.16762 3.73046 9.96538 3.73047ZM6.96823 6.06552C7.17643 6.0638 7.39756 6.0638 7.63205 6.0638H12.3627C12.5972 6.0638 12.8184 6.0638 13.0266 6.06552C12.9788 5.47002 12.8712 5.18561 12.6755 4.98989C12.514 4.82845 12.2874 4.72319 11.8593 4.66564C11.4187 4.6064 10.8347 4.60547 9.9974 4.60547C9.16007 4.60547 8.57609 4.6064 8.13547 4.66564C7.70743 4.72319 7.48076 4.82845 7.31932 4.98989C7.1236 5.18561 7.01603 5.47002 6.96823 6.06552ZM6.06161 13.0305C6.05989 12.8223 6.05989 12.6011 6.0599 12.3666L6.0599 10.5487C5.96971 10.5852 5.88363 10.6221 5.8016 10.6589C5.58117 10.7579 5.32225 10.6594 5.22328 10.439C5.12431 10.2185 5.22277 9.95963 5.4432 9.86066C6.44755 9.40971 7.94435 8.98047 9.9974 8.98047C12.0504 8.98047 13.5472 9.40971 14.5516 9.86066C14.772 9.95963 14.8705 10.2185 14.7715 10.439C14.6725 10.6594 14.4136 10.7579 14.1932 10.6589C14.1112 10.6221 14.0251 10.5852 13.9349 10.5487V12.3666C13.9349 12.6011 13.9349 12.8223 13.9332 13.0305C14.5287 12.9827 14.8131 12.8751 15.0088 12.6794C15.1703 12.5179 15.2755 12.2913 15.3331 11.8632C15.3923 11.4226 15.3932 10.8386 15.3932 10.0013C15.3932 9.16398 15.3923 8.57999 15.3331 8.13937C15.2755 7.71134 15.1703 7.48467 15.0088 7.32323C14.8474 7.16178 14.6207 7.05652 14.1927 6.99897C13.752 6.93973 13.1681 6.9388 12.3307 6.9388H7.66406C6.82674 6.9388 6.24275 6.93973 5.80213 6.99897C5.3741 7.05652 5.14743 7.16178 4.98599 7.32323C4.82454 7.48467 4.71928 7.71134 4.66173 8.13937C4.60249 8.57999 4.60156 9.16398 4.60156 10.0013C4.60156 10.8386 4.60249 11.4226 4.66173 11.8632C4.71928 12.2913 4.82454 12.5179 4.98599 12.6794C5.1817 12.8751 5.46611 12.9827 6.06161 13.0305ZM13.0599 10.2503C12.2567 10.0233 11.2423 9.85547 9.9974 9.85547C8.75254 9.85547 7.73811 10.0233 6.9349 10.2503V12.3346C6.9349 13.172 6.93582 13.7559 6.99506 14.1966C7.05261 14.6246 7.15787 14.8513 7.31932 15.0127C7.48076 15.1742 7.70743 15.2794 8.13547 15.337C8.57609 15.3962 9.16007 15.3971 9.9974 15.3971C10.8347 15.3971 11.4187 15.3962 11.8593 15.337C12.2874 15.2794 12.514 15.1742 12.6755 15.0127C12.8369 14.8513 12.9422 14.6246 12.9997 14.1966C13.059 13.7559 13.0599 13.172 13.0599 12.3346V10.2503Z"
          fill="#101828"
        />
        <path
          d="M4.98599 12.6794C4.82454 12.5179 4.71928 12.2913 4.66173 11.8632C4.60249 11.4226 4.60156 10.8386 4.60156 10.0013C4.60156 9.16398 4.60249 8.57999 4.66173 8.13937C4.71928 7.71134 4.82454 7.48467 4.98599 7.32323C5.14743 7.16178 5.3741 7.05652 5.80213 6.99897C6.24275 6.93973 6.82674 6.9388 7.66406 6.9388H12.3307C13.1681 6.9388 13.752 6.93973 14.1927 6.99897C14.6207 7.05652 14.8474 7.16178 15.0088 7.32323C15.1703 7.48467 15.2755 7.71134 15.3331 8.13937C15.3923 8.57999 15.3932 9.16398 15.3932 10.0013C15.3932 10.8386 15.3923 11.4226 15.3331 11.8632C15.2755 12.2913 15.1703 12.5179 15.0088 12.6794C14.8131 12.8751 14.5287 12.9827 13.9332 13.0305C13.9349 12.8223 13.9349 12.6011 13.9349 12.3666V10.5487C14.0251 10.5852 14.1112 10.6221 14.1932 10.6589C14.4136 10.7579 14.6725 10.6594 14.7715 10.439C14.8705 10.2185 14.772 9.95963 14.5516 9.86066C13.5472 9.40971 12.0504 8.98047 9.9974 8.98047C7.94435 8.98047 6.44755 9.40971 5.4432 9.86066C5.22277 9.95963 5.12431 10.2185 5.22328 10.439C5.32225 10.6594 5.58117 10.7579 5.8016 10.6589C5.88363 10.6221 5.96971 10.5852 6.0599 10.5487L6.0599 12.3666C6.05989 12.6011 6.05989 12.8223 6.06161 13.0305C5.46611 12.9827 5.1817 12.8751 4.98599 12.6794ZM4.98599 12.6794L4.67663 12.9887M9.96538 3.73047C9.16762 3.73046 8.5246 3.73045 8.01887 3.79844C7.49381 3.86903 7.05172 4.02006 6.7006 4.37117C6.26894 4.80283 6.13545 5.37848 6.08836 6.09263C5.94543 6.10218 5.81124 6.11487 5.68554 6.13177C5.16048 6.20237 4.71838 6.35339 4.36727 6.70451C4.01615 7.05562 3.86513 7.49772 3.79453 8.02278C3.72654 8.52851 3.72655 9.17153 3.72656 9.96929V10.0333C3.72655 10.8311 3.72654 11.4741 3.79453 11.9798C3.86513 12.5049 4.01615 12.947 4.36727 13.2981C4.79892 13.7298 5.37458 13.8632 6.08873 13.9103C6.09827 14.0533 6.11097 14.1875 6.12787 14.3132C6.19846 14.8382 6.34948 15.2803 6.7006 15.6314C7.05172 15.9826 7.49381 16.1336 8.01887 16.2042C8.52461 16.2722 9.16763 16.2721 9.96539 16.2721H10.0294C10.8272 16.2721 11.4702 16.2722 11.9759 16.2042C12.501 16.1336 12.9431 15.9826 13.2942 15.6314C13.6453 15.2803 13.7963 14.8382 13.8669 14.3132C13.8838 14.1875 13.8965 14.0533 13.9061 13.9103C14.6202 13.8632 15.1959 13.7298 15.6275 13.2981C15.9786 12.947 16.1297 12.5049 16.2003 11.9798C16.2683 11.4741 16.2682 10.8311 16.2682 10.0333V9.9693C16.2682 9.17153 16.2683 8.52851 16.2003 8.02278C16.1297 7.49772 15.9786 7.05562 15.6275 6.70451C15.2764 6.35339 14.8343 6.20237 14.3093 6.13177C14.1835 6.11487 14.0494 6.10218 13.9064 6.09263C13.8593 5.37848 13.7258 4.80283 13.2942 4.37117C12.9431 4.02006 12.501 3.86903 11.9759 3.79844C11.4702 3.73045 10.8272 3.73046 10.0294 3.73047H9.96538ZM7.63205 6.0638C7.39756 6.0638 7.17643 6.0638 6.96823 6.06552C7.01603 5.47002 7.1236 5.18561 7.31932 4.98989C7.48076 4.82845 7.70743 4.72319 8.13547 4.66564C8.57609 4.6064 9.16007 4.60547 9.9974 4.60547C10.8347 4.60547 11.4187 4.6064 11.8593 4.66564C12.2874 4.72319 12.514 4.82845 12.6755 4.98989C12.8712 5.18561 12.9788 5.47002 13.0266 6.06552C12.8184 6.0638 12.5972 6.0638 12.3627 6.0638H7.63205ZM9.9974 9.85547C11.2423 9.85547 12.2567 10.0233 13.0599 10.2503V12.3346C13.0599 13.172 13.059 13.7559 12.9997 14.1966C12.9422 14.6246 12.8369 14.8513 12.6755 15.0127C12.514 15.1742 12.2874 15.2794 11.8593 15.337C11.4187 15.3962 10.8347 15.3971 9.9974 15.3971C9.16007 15.3971 8.57609 15.3962 8.13547 15.337C7.70743 15.2794 7.48076 15.1742 7.31932 15.0127C7.15787 14.8513 7.05261 14.6246 6.99506 14.1966C6.93582 13.7559 6.9349 13.172 6.9349 12.3346V10.2503C7.73811 10.0233 8.75254 9.85547 9.9974 9.85547Z"
          stroke="#101828"
          strokeWidth="0.3"
          strokeLinecap="round"
        />
      </g>
      <rect x="10" y="12" width="7" height="7" fill="currentColor" />
      <path
        d="M15.445 16.9931L15.2228 18.0534L11.4807 17.2694L12.2647 13.5273L13.325 13.7494L12.9203 15.6815L15.7843 13.8097L16.377 14.7165L13.5196 16.584L15.445 16.9931Z"
        fill='var(--color-ucass-active)'
      />
      <defs>
        <clipPath id="clip0_5480_100310">
          <rect width="14" height="14" fill="white" transform="translate(3 3)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const FaxOutgoing = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g clipPath="url(#clip0_5480_100294)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9.96538 3.73047H10.0294C10.8272 3.73046 11.4702 3.73045 11.9759 3.79844C12.501 3.86903 12.9431 4.02006 13.2942 4.37117C13.7258 4.80283 13.8593 5.37848 13.9064 6.09263C14.0494 6.10218 14.1835 6.11487 14.3093 6.13177C14.8343 6.20237 15.2764 6.35339 15.6275 6.70451C15.9786 7.05562 16.1297 7.49772 16.2003 8.02278C16.2683 8.52851 16.2682 9.17153 16.2682 9.9693V10.0333C16.2682 10.8311 16.2683 11.4741 16.2003 11.9798C16.1297 12.5049 15.9786 12.947 15.6275 13.2981C15.1959 13.7298 14.6202 13.8632 13.9061 13.9103C13.8965 14.0533 13.8838 14.1875 13.8669 14.3132C13.7963 14.8382 13.6453 15.2803 13.2942 15.6314C12.9431 15.9826 12.501 16.1336 11.9759 16.2042C11.4702 16.2722 10.8272 16.2721 10.0294 16.2721H9.96539C9.16763 16.2721 8.52461 16.2722 8.01887 16.2042C7.49381 16.1336 7.05172 15.9826 6.7006 15.6314C6.34948 15.2803 6.19846 14.8382 6.12787 14.3132C6.11097 14.1875 6.09827 14.0533 6.08873 13.9103C5.37458 13.8632 4.79892 13.7298 4.36727 13.2981C4.01615 12.947 3.86513 12.5049 3.79453 11.9798C3.72654 11.4741 3.72655 10.8311 3.72656 10.0333V9.96929C3.72655 9.17153 3.72654 8.52851 3.79453 8.02278C3.86513 7.49772 4.01615 7.05562 4.36727 6.70451C4.71838 6.35339 5.16048 6.20237 5.68554 6.13177C5.81124 6.11487 5.94543 6.10218 6.08836 6.09263C6.13545 5.37848 6.26894 4.80283 6.7006 4.37117C7.05172 4.02006 7.49381 3.86903 8.01887 3.79844C8.5246 3.73045 9.16762 3.73046 9.96538 3.73047ZM6.96823 6.06552C7.17643 6.0638 7.39756 6.0638 7.63205 6.0638H12.3627C12.5972 6.0638 12.8184 6.0638 13.0266 6.06552C12.9788 5.47002 12.8712 5.18561 12.6755 4.98989C12.514 4.82845 12.2874 4.72319 11.8593 4.66564C11.4187 4.6064 10.8347 4.60547 9.9974 4.60547C9.16007 4.60547 8.57609 4.6064 8.13547 4.66564C7.70743 4.72319 7.48076 4.82845 7.31932 4.98989C7.1236 5.18561 7.01603 5.47002 6.96823 6.06552ZM6.06161 13.0305C6.05989 12.8223 6.05989 12.6011 6.0599 12.3666L6.0599 10.5487C5.96971 10.5852 5.88363 10.6221 5.8016 10.6589C5.58117 10.7579 5.32225 10.6594 5.22328 10.439C5.12431 10.2185 5.22277 9.95963 5.4432 9.86066C6.44755 9.40971 7.94435 8.98047 9.9974 8.98047C12.0504 8.98047 13.5472 9.40971 14.5516 9.86066C14.772 9.95963 14.8705 10.2185 14.7715 10.439C14.6725 10.6594 14.4136 10.7579 14.1932 10.6589C14.1112 10.6221 14.0251 10.5852 13.9349 10.5487V12.3666C13.9349 12.6011 13.9349 12.8223 13.9332 13.0305C14.5287 12.9827 14.8131 12.8751 15.0088 12.6794C15.1703 12.5179 15.2755 12.2913 15.3331 11.8632C15.3923 11.4226 15.3932 10.8386 15.3932 10.0013C15.3932 9.16398 15.3923 8.57999 15.3331 8.13937C15.2755 7.71134 15.1703 7.48467 15.0088 7.32323C14.8474 7.16178 14.6207 7.05652 14.1927 6.99897C13.752 6.93973 13.1681 6.9388 12.3307 6.9388H7.66406C6.82674 6.9388 6.24275 6.93973 5.80213 6.99897C5.3741 7.05652 5.14743 7.16178 4.98599 7.32323C4.82454 7.48467 4.71928 7.71134 4.66173 8.13937C4.60249 8.57999 4.60156 9.16398 4.60156 10.0013C4.60156 10.8386 4.60249 11.4226 4.66173 11.8632C4.71928 12.2913 4.82454 12.5179 4.98599 12.6794C5.1817 12.8751 5.46611 12.9827 6.06161 13.0305ZM13.0599 10.2503C12.2567 10.0233 11.2423 9.85547 9.9974 9.85547C8.75254 9.85547 7.73811 10.0233 6.9349 10.2503V12.3346C6.9349 13.172 6.93582 13.7559 6.99506 14.1966C7.05261 14.6246 7.15787 14.8513 7.31932 15.0127C7.48076 15.1742 7.70743 15.2794 8.13547 15.337C8.57609 15.3962 9.16007 15.3971 9.9974 15.3971C10.8347 15.3971 11.4187 15.3962 11.8593 15.337C12.2874 15.2794 12.514 15.1742 12.6755 15.0127C12.8369 14.8513 12.9422 14.6246 12.9997 14.1966C13.059 13.7559 13.0599 13.172 13.0599 12.3346V10.2503Z"
          fill="#101828"
        />
        <path
          d="M4.98599 12.6794C4.82454 12.5179 4.71928 12.2913 4.66173 11.8632C4.60249 11.4226 4.60156 10.8386 4.60156 10.0013C4.60156 9.16398 4.60249 8.57999 4.66173 8.13937C4.71928 7.71134 4.82454 7.48467 4.98599 7.32323C5.14743 7.16178 5.3741 7.05652 5.80213 6.99897C6.24275 6.93973 6.82674 6.9388 7.66406 6.9388H12.3307C13.1681 6.9388 13.752 6.93973 14.1927 6.99897C14.6207 7.05652 14.8474 7.16178 15.0088 7.32323C15.1703 7.48467 15.2755 7.71134 15.3331 8.13937C15.3923 8.57999 15.3932 9.16398 15.3932 10.0013C15.3932 10.8386 15.3923 11.4226 15.3331 11.8632C15.2755 12.2913 15.1703 12.5179 15.0088 12.6794C14.8131 12.8751 14.5287 12.9827 13.9332 13.0305C13.9349 12.8223 13.9349 12.6011 13.9349 12.3666V10.5487C14.0251 10.5852 14.1112 10.6221 14.1932 10.6589C14.4136 10.7579 14.6725 10.6594 14.7715 10.439C14.8705 10.2185 14.772 9.95963 14.5516 9.86066C13.5472 9.40971 12.0504 8.98047 9.9974 8.98047C7.94435 8.98047 6.44755 9.40971 5.4432 9.86066C5.22277 9.95963 5.12431 10.2185 5.22328 10.439C5.32225 10.6594 5.58117 10.7579 5.8016 10.6589C5.88363 10.6221 5.96971 10.5852 6.0599 10.5487L6.0599 12.3666C6.05989 12.6011 6.05989 12.8223 6.06161 13.0305C5.46611 12.9827 5.1817 12.8751 4.98599 12.6794ZM4.98599 12.6794L4.67663 12.9887M9.96538 3.73047C9.16762 3.73046 8.5246 3.73045 8.01887 3.79844C7.49381 3.86903 7.05172 4.02006 6.7006 4.37117C6.26894 4.80283 6.13545 5.37848 6.08836 6.09263C5.94543 6.10218 5.81124 6.11487 5.68554 6.13177C5.16048 6.20237 4.71838 6.35339 4.36727 6.70451C4.01615 7.05562 3.86513 7.49772 3.79453 8.02278C3.72654 8.52851 3.72655 9.17153 3.72656 9.96929V10.0333C3.72655 10.8311 3.72654 11.4741 3.79453 11.9798C3.86513 12.5049 4.01615 12.947 4.36727 13.2981C4.79892 13.7298 5.37458 13.8632 6.08873 13.9103C6.09827 14.0533 6.11097 14.1875 6.12787 14.3132C6.19846 14.8382 6.34948 15.2803 6.7006 15.6314C7.05172 15.9826 7.49381 16.1336 8.01887 16.2042C8.52461 16.2722 9.16763 16.2721 9.96539 16.2721H10.0294C10.8272 16.2721 11.4702 16.2722 11.9759 16.2042C12.501 16.1336 12.9431 15.9826 13.2942 15.6314C13.6453 15.2803 13.7963 14.8382 13.8669 14.3132C13.8838 14.1875 13.8965 14.0533 13.9061 13.9103C14.6202 13.8632 15.1959 13.7298 15.6275 13.2981C15.9786 12.947 16.1297 12.5049 16.2003 11.9798C16.2683 11.4741 16.2682 10.8311 16.2682 10.0333V9.9693C16.2682 9.17153 16.2683 8.52851 16.2003 8.02278C16.1297 7.49772 15.9786 7.05562 15.6275 6.70451C15.2764 6.35339 14.8343 6.20237 14.3093 6.13177C14.1835 6.11487 14.0494 6.10218 13.9064 6.09263C13.8593 5.37848 13.7258 4.80283 13.2942 4.37117C12.9431 4.02006 12.501 3.86903 11.9759 3.79844C11.4702 3.73045 10.8272 3.73046 10.0294 3.73047H9.96538ZM7.63205 6.0638C7.39756 6.0638 7.17643 6.0638 6.96823 6.06552C7.01603 5.47002 7.1236 5.18561 7.31932 4.98989C7.48076 4.82845 7.70743 4.72319 8.13547 4.66564C8.57609 4.6064 9.16007 4.60547 9.9974 4.60547C10.8347 4.60547 11.4187 4.6064 11.8593 4.66564C12.2874 4.72319 12.514 4.82845 12.6755 4.98989C12.8712 5.18561 12.9788 5.47002 13.0266 6.06552C12.8184 6.0638 12.5972 6.0638 12.3627 6.0638H7.63205ZM9.9974 9.85547C11.2423 9.85547 12.2567 10.0233 13.0599 10.2503V12.3346C13.0599 13.172 13.059 13.7559 12.9997 14.1966C12.9422 14.6246 12.8369 14.8513 12.6755 15.0127C12.514 15.1742 12.2874 15.2794 11.8593 15.337C11.4187 15.3962 10.8347 15.3971 9.9974 15.3971C9.16007 15.3971 8.57609 15.3962 8.13547 15.337C7.70743 15.2794 7.48076 15.1742 7.31932 15.0127C7.15787 14.8513 7.05261 14.6246 6.99506 14.1966C6.93582 13.7559 6.9349 13.172 6.9349 12.3346V10.2503C7.73811 10.0233 8.75254 9.85547 9.9974 9.85547Z"
          stroke="#101828"
          strokeWidth="0.3"
          strokeLinecap="round"
        />
      </g>
      <rect x="12" y="12" width="7" height="7" fill="white" />
      <path
        d="M14.8505 13.68L15.6675 12.903L18.513 15.6844L15.6297 18.4265L14.8234 17.6384L16.3121 16.2227L12.687 16.1978L12.6946 15.0912L16.3113 15.116L14.8505 13.68Z"
        fill='var(--color-ucass-active)'
      />
      <defs>
        <clipPath id="clip0_5480_100294">
          <rect width="14" height="14" fill="white" transform="translate(3 3)" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const VolumeLoudLine = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M20 6C20 6 21.5 7.8 21.5 12C21.5 16.2 20 18 20 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M18 9C18 9 18.5 9.9 18.5 12C18.5 14.1 18 15 18 15"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M1.95717 8.57581C2.24335 8.04466 2.79093 7.52944 3.33851 7.2761C3.93784 6.99881 4.62479 6.99881 5.99871 6.99881C6.51078 6.99881 6.76682 6.99881 7.01483 6.95693C7.26001 6.91553 7.49909 6.8438 7.72657 6.74341C7.95668 6.64185 8.17044 6.50091 8.59794 6.21904L8.81688 6.07469C11.3599 4.398 12.6313 3.55966 13.6987 3.92389C13.9033 3.99373 14.1014 4.09453 14.2783 4.21886C15.201 4.86731 15.2711 6.37602 15.4113 9.39343C15.4633 10.5107 15.4986 11.4669 15.4986 11.9988C15.4986 12.5307 15.4633 13.4869 15.4113 14.6042C15.2711 17.6216 15.201 19.1303 14.2783 19.7788C14.1014 19.9031 13.9033 20.0039 13.6987 20.0737C12.6313 20.438 11.3599 19.5996 8.81688 17.9229L8.59794 17.7786C8.17044 17.4967 7.95668 17.3558 7.72657 17.2542C7.49909 17.1538 7.26001 17.0821 7.01483 17.0407C6.76682 16.9988 6.51078 16.9988 5.99871 16.9988C4.62479 16.9988 3.93784 16.9988 3.33851 16.7215C2.79093 16.4682 2.24335 15.953 1.95717 15.4218C1.64393 14.8405 1.60709 14.236 1.53342 13.0272C1.5225 12.8481 1.51379 12.6712 1.50781 12.4988"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const PipLine = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g opacity="1">
        <path
          d="M13 17C13 15.1144 13 14.1716 13.5858 13.5858C14.1716 13 15.1144 13 17 13H18C19.8856 13 20.8284 13 21.4142 13.5858C22 14.1716 22 15.1144 22 17C22 18.8856 22 19.8284 21.4142 20.4142C20.8284 21 19.8856 21 18 21H17C15.1144 21 14.1716 21 13.5858 20.4142C13 19.8284 13 18.8856 13 17Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M11.5 11.5V8.5M11.5 11.5H8.5M11.5 11.5L7.5 7.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 21H10C6.22876 21 4.34315 21 3.17157 19.8284C2 18.6569 2 16.7712 2 13V11M22 11C22 7.22876 22 5.34315 20.8284 4.17157C19.6569 3 17.7712 3 14 3H10C6.22876 3 4.34315 3 3.17157 4.17157C2.51839 4.82475 2.22937 5.69989 2.10149 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
export const MaximizeLine = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M22 2H16.1429M22 2V7.85714M22 2L18.5 5.5M15 9L15.875 8.125"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 15L2 22M2 22H7.85714M2 22V16.1429"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
export const SupportAgentLine = ({ className }: IconProps) => {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={className}>
      <path
        d="M12.2474 7.12833C12.2474 3.92583 9.7624 1.75 6.9974 1.75C4.26156 1.75 1.7474 3.87917 1.7474 7.16333C1.3974 7.36167 1.16406 7.735 1.16406 8.16667V9.33333C1.16406 9.975 1.68906 10.5 2.33073 10.5H2.91406V6.94167C2.91406 4.68417 4.7399 2.85833 6.9974 2.85833C9.2549 2.85833 11.0807 4.68417 11.0807 6.94167V11.0833H6.41406V12.25H11.0807C11.7224 12.25 12.2474 11.725 12.2474 11.0833V10.3717C12.5916 10.1908 12.8307 9.835 12.8307 9.415V8.07333C12.8307 7.665 12.5916 7.30917 12.2474 7.12833Z"
        fill="currentColor"
      />
      <path
        d="M5.2474 8.16667C5.56956 8.16667 5.83073 7.9055 5.83073 7.58333C5.83073 7.26117 5.56956 7 5.2474 7C4.92523 7 4.66406 7.26117 4.66406 7.58333C4.66406 7.9055 4.92523 8.16667 5.2474 8.16667Z"
        fill="currentColor"
      />
      <path
        d="M8.7474 8.16667C9.06956 8.16667 9.33073 7.9055 9.33073 7.58333C9.33073 7.26117 9.06956 7 8.7474 7C8.42523 7 8.16406 7.26117 8.16406 7.58333C8.16406 7.9055 8.42523 8.16667 8.7474 8.16667Z"
        fill="currentColor"
      />
      <path
        d="M10.4968 6.43417C10.3578 5.61408 9.933 4.86965 9.29778 4.33264C8.66255 3.79563 7.85781 3.50068 7.02602 3.5C5.25852 3.5 3.35685 4.96417 3.50852 7.2625C4.22799 6.96836 4.86343 6.50065 5.35812 5.90112C5.85281 5.30159 6.19135 4.5889 6.34352 3.82667C7.10768 5.36083 8.67685 6.41667 10.4968 6.43417Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const CheckMarkIcon = ({ className }: IconProps) => {
  return (
    <svg className={className} width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708" />
    </svg>
  );
};
export const TablerPinLine = ({ className }: IconProps) => {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" className={className}>
      <path
        d="M10.5 3.0013L7.83333 5.66797L5.16667 6.66797L4.16667 7.66797L8.83333 12.3346L9.83333 11.3346L10.8333 8.66797L13.5 6.0013M6.5 10.0013L3.5 13.0013M10.1667 2.66797L13.8333 6.33464"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const RoundSearch = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15.5014 14.0014H14.7114L14.4314 13.7314C15.0564 13.0054 15.5131 12.1502 15.769 11.2271C16.0248 10.3039 16.0735 9.33559 15.9114 8.39144C15.4414 5.61144 13.1214 3.39144 10.3214 3.05144C9.33706 2.92691 8.33723 3.02921 7.39846 3.35053C6.4597 3.67185 5.60688 4.20366 4.90527 4.90527C4.20366 5.60688 3.67185 6.4597 3.35053 7.39846C3.02921 8.33723 2.92691 9.33706 3.05144 10.3214C3.39144 13.1214 5.61144 15.4414 8.39144 15.9114C9.33559 16.0735 10.3039 16.0248 11.2271 15.769C12.1502 15.5131 13.0054 15.0564 13.7314 14.4314L14.0014 14.7114V15.5014L18.2514 19.7514C18.6614 20.1614 19.3314 20.1614 19.7414 19.7514C20.1514 19.3414 20.1514 18.6714 19.7414 18.2614L15.5014 14.0014ZM9.50144 14.0014C7.01144 14.0014 5.00144 11.9914 5.00144 9.50144C5.00144 7.01144 7.01144 5.00144 9.50144 5.00144C11.9914 5.00144 14.0014 7.01144 14.0014 9.50144C14.0014 11.9914 11.9914 14.0014 9.50144 14.0014Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const ScreenLine = ({ className }: IconProps) => {
  return (
    <svg width="15" height="14" viewBox="0 0 15 14" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.92708 9.91667H2.84375C2.37962 9.91667 1.9345 9.73229 1.60631 9.4041C1.27812 9.07591 1.09375 8.6308 1.09375 8.16667V3.5C1.09375 3.03587 1.27812 2.59075 1.60631 2.26256C1.9345 1.93437 2.37962 1.75 2.84375 1.75H12.1771C12.6412 1.75 13.0863 1.93437 13.4145 2.26256C13.7427 2.59075 13.9271 3.03587 13.9271 3.5V8.16667C13.9271 8.6308 13.7427 9.07591 13.4145 9.4041C13.0863 9.73229 12.6412 9.91667 12.1771 9.91667H8.09375V11.0833H9.84375C9.99846 11.0833 10.1468 11.1448 10.2562 11.2542C10.3656 11.3636 10.4271 11.512 10.4271 11.6667C10.4271 11.8214 10.3656 11.9697 10.2562 12.0791C10.1468 12.1885 9.99846 12.25 9.84375 12.25H5.17708C5.02237 12.25 4.874 12.1885 4.7646 12.0791C4.65521 11.9697 4.59375 11.8214 4.59375 11.6667C4.59375 11.512 4.65521 11.3636 4.7646 11.2542C4.874 11.1448 5.02237 11.0833 5.17708 11.0833H6.92708V9.91667ZM2.84375 2.91667H12.1771C12.3318 2.91667 12.4802 2.97812 12.5896 3.08752C12.699 3.19692 12.7604 3.34529 12.7604 3.5V8.16667C12.7604 8.32138 12.699 8.46975 12.5896 8.57915C12.4802 8.68854 12.3318 8.75 12.1771 8.75H2.84375C2.68904 8.75 2.54067 8.68854 2.43127 8.57915C2.32187 8.46975 2.26042 8.32138 2.26042 8.16667V3.5C2.26042 3.34529 2.32187 3.19692 2.43127 3.08752C2.54067 2.97812 2.68904 2.91667 2.84375 2.91667Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const LaptopLine = ({ className }: IconProps) => {
  return (
    <svg width="18" height="19" viewBox="0 0 18 19" fill="none" className={className}>
      <path
        d="M3.76042 6.15234C3.76042 5.75452 3.90967 5.37299 4.17535 5.09168C4.44103 4.81038 4.80136 4.65234 5.17708 4.65234H12.6146C12.9903 4.65234 13.3506 4.81038 13.6163 5.09168C13.882 5.37299 14.0313 5.75452 14.0313 6.15234V12.9023H3.76042V6.15234ZM2.34375 13.6523C2.34375 13.4534 2.41838 13.2627 2.55122 13.122C2.68405 12.9814 2.86422 12.9023 3.05208 12.9023H14.7396C14.9274 12.9023 15.1076 12.9814 15.2405 13.122C15.3733 13.2627 15.4479 13.4534 15.4479 13.6523V14.4023C15.4479 14.8002 15.2987 15.1817 15.033 15.463C14.7673 15.7443 14.407 15.9023 14.0313 15.9023H3.76042C3.38469 15.9023 3.02436 15.7443 2.75868 15.463C2.49301 15.1817 2.34375 14.8002 2.34375 14.4023V13.6523Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const ContactCard = ({ className }: IconProps) => {
  return (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" className={className}>
      <path
        d="M2.00781 8.21875C2.00781 6.649 3.28181 5.375 4.85156 5.375H21.9141C23.4838 5.375 24.7578 6.649 24.7578 8.21875V18.7812C24.7578 19.5355 24.4582 20.2588 23.9249 20.7921C23.3916 21.3254 22.6683 21.625 21.9141 21.625H4.85156C4.09735 21.625 3.37403 21.3254 2.84073 20.7921C2.30742 20.2588 2.00781 19.5355 2.00781 18.7812V8.21875ZM4.85156 7C4.52833 7 4.21834 7.1284 3.98978 7.35696C3.76122 7.58552 3.63281 7.89552 3.63281 8.21875V18.7812C3.63281 19.454 4.17881 20 4.85156 20H21.9141C22.2373 20 22.5473 19.8716 22.7758 19.643C23.0044 19.4145 23.1328 19.1045 23.1328 18.7812V8.21875C23.1328 7.89552 23.0044 7.58552 22.7758 7.35696C22.5473 7.1284 22.2373 7 21.9141 7H4.85156ZM15.8203 10.25C15.6048 10.25 15.3982 10.3356 15.2458 10.488C15.0934 10.6403 15.0078 10.847 15.0078 11.0625C15.0078 11.278 15.0934 11.4847 15.2458 11.637C15.3982 11.7894 15.6048 11.875 15.8203 11.875H20.6953C20.9108 11.875 21.1175 11.7894 21.2698 11.637C21.4222 11.4847 21.5078 11.278 21.5078 11.0625C21.5078 10.847 21.4222 10.6403 21.2698 10.488C21.1175 10.3356 20.9108 10.25 20.6953 10.25H15.8203ZM15.8203 15.125C15.6048 15.125 15.3982 15.2106 15.2458 15.363C15.0934 15.5153 15.0078 15.722 15.0078 15.9375C15.0078 16.153 15.0934 16.3597 15.2458 16.512C15.3982 16.6644 15.6048 16.75 15.8203 16.75H20.6953C20.9108 16.75 21.1175 16.6644 21.2698 16.512C21.4222 16.3597 21.5078 16.153 21.5078 15.9375C21.5078 15.722 21.4222 15.5153 21.2698 15.363C21.1175 15.2106 20.9108 15.125 20.6953 15.125H15.8203ZM8.93194 13.0353C9.22152 13.0353 9.50826 12.9782 9.7758 12.8674C10.0433 12.7566 10.2864 12.5941 10.4912 12.3894C10.696 12.1846 10.8584 11.9415 10.9692 11.674C11.08 11.4065 11.1371 11.1197 11.1371 10.8301C11.1371 10.5405 11.08 10.2538 10.9692 9.98626C10.8584 9.71872 10.696 9.47563 10.4912 9.27087C10.2864 9.0661 10.0433 8.90367 9.7758 8.79285C9.50826 8.68204 9.22152 8.625 8.93194 8.625C8.3471 8.625 7.78622 8.85733 7.37268 9.27087C6.95914 9.68441 6.72681 10.2453 6.72681 10.8301C6.72681 11.415 6.95914 11.9758 7.37268 12.3894C7.78622 12.8029 8.3471 13.0353 8.93194 13.0353ZM6.65206 14.137C6.28255 14.1379 5.92841 14.285 5.66713 14.5463C5.40584 14.8076 5.25867 15.1617 5.25781 15.5312C5.25787 16.1364 5.4602 16.7242 5.83266 17.2012C6.20512 17.6782 6.72633 18.017 7.31344 18.1637L7.39956 18.1865C8.40706 18.4384 9.45844 18.4384 10.4643 18.1865L10.5521 18.1654C11.1392 18.0186 11.6604 17.6798 12.0328 17.2028C12.4053 16.7258 12.6076 16.1381 12.6077 15.5329C12.6073 15.1631 12.4603 14.8085 12.1989 14.5469C11.9376 14.2853 11.5832 14.1379 11.2134 14.137H6.65206Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PCLine = ({ className }: IconProps) => {
  return (
    <svg width="20" height="17" viewBox="0 0 20 17" fill="none" className={className}>
      <path
        d="M18.9375 0.53125H1.0625C0.682227 0.53125 0.375 0.838477 0.375 1.21875V11.875C0.375 12.2553 0.682227 12.5625 1.0625 12.5625H9.22656V14.9688H5.53125C5.34219 14.9688 5.1875 15.1234 5.1875 15.3125V16.3438C5.1875 16.4383 5.26484 16.5156 5.35938 16.5156H14.6406C14.7352 16.5156 14.8125 16.4383 14.8125 16.3438V15.3125C14.8125 15.1234 14.6578 14.9688 14.4688 14.9688H10.7734V12.5625H18.9375C19.3178 12.5625 19.625 12.2553 19.625 11.875V1.21875C19.625 0.838477 19.3178 0.53125 18.9375 0.53125ZM18.0781 11.0156H1.92188V2.07812H18.0781V11.0156Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CalendarLineIcon = ({ className }: IconProps) => {
  return (
    <svg viewBox="3 2 18 20" className={className}>
      <path
        d="M3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7v2H5a2 2 0 0 0-2 2zm16 14H5V8h14z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const UsersLine = ({ className }: IconProps) => {
  return (
    <svg viewBox="2 3.17 19 16.83" className={className}>
      <path
        d="M16.604 11.048a5.67 5.67 0 0 0 .751-3.44c-.179-1.784-1.175-3.361-2.803-4.44l-1.105 1.666c1.119.742 1.8 1.799 1.918 2.974a3.693 3.693 0 0 1-1.072 2.986l-1.192 1.192 1.618.475C18.951 13.701 19 17.957 19 18h2c0-1.789-.956-5.285-4.396-6.952z"
        fill="currentColor"
      ></path>
      <path
        d="M9.5 12c2.206 0 4-1.794 4-4s-1.794-4-4-4-4 1.794-4 4 1.794 4 4 4zm0-6c1.103 0 2 .897 2 2s-.897 2-2 2-2-.897-2-2 .897-2 2-2zm1.5 7H8c-3.309 0-6 2.691-6 6v1h2v-1c0-2.206 1.794-4 4-4h3c2.206 0 4 1.794 4 4v1h2v-1c0-3.309-2.691-6-6-6z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const Leads = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="4 2 15.99 20.01" className={className}>
      <path d="m12,2c-4.41,0-8,3.59-8,8,0,2.52,1.17,4.77,3,6.24v4.77c0,.35.18.67.47.85.29.18.66.2.97.04l3.55-1.78,3.55,1.78c.14.07.29.11.45.11.18,0,.37-.05.53-.15.29-.18.47-.5.47-.85v-4.76c1.83-1.47,3-3.72,3-6.24,0-4.41-3.59-8-8-8Zm0,14c-3.31,0-6-2.69-6-6s2.69-6,6-6,6,2.69,6,6-2.69,6-6,6Z"></path>
    </svg>
  );
};
export const Monitor = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="0 2 16 12.5" className={className}>
      <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4q0 1 .25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75Q6 13 6 12H2s-2 0-2-2zm1.398-.855a.76.76 0 0 0-.254.302A1.5 1.5 0 0 0 1 4.01V10c0 .325.078.502.145.602q.105.156.302.254a1.5 1.5 0 0 0 .538.143L2.01 11H14c.325 0 .502-.078.602-.145a.76.76 0 0 0 .254-.302 1.5 1.5 0 0 0 .143-.538L15 9.99V4c0-.325-.078-.502-.145-.602a.76.76 0 0 0-.302-.254A1.5 1.5 0 0 0 13.99 3H2c-.325 0-.502.078-.602.145"></path>
    </svg>
  );
};
export const ArrowUpRight = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="7.29 7 9.71 9.71" className={className}>
      <path d="M17 16V7H8v2h5.59l-6.3 6.29 1.42 1.42 6.29-6.3V16z"></path>
    </svg>
  );
};
export const ClockLine = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 2 20 20" className={className}>
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8"></path>
      <path d="M13 6h-2v6c0 .36.19.69.5.87l5.2 3 1-1.73-4.7-2.71V6.01Z"></path>
    </svg>
  );
};
export const GraphLine = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="1 1 14 14" className={className}>
      <path d="M4 11H2v3h2zm5-4H7v7h2zm5-5v12h-2V2zm-2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM6 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm-5 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"></path>
    </svg>
  );
};
export const WarningLine = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="1 2.04 21.99 19.95" className={className}>
      <path d="M11 9h2v6h-2zM11 17h2v2h-2z"></path>
      <path d="M12.87 2.51c-.35-.63-1.4-.63-1.75 0l-9.99 18c-.17.31-.17.69.01.99.18.31.51.49.86.49h20c.35 0 .68-.19.86-.49a1 1 0 0 0 .01-.99zM3.7 20 12 5.06 20.3 20z"></path>
    </svg>
  );
};
export const DoorOpen = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="3 2 18 20" className={className}>
      <path d="m20.2,4.02l-10-2c-.29-.06-.6.02-.83.21-.23.19-.37.47-.37.77v1h-5c-.55,0-1,.45-1,1v14c0,.55.45,1,1,1h5v1c0,.3.13.58.37.77.18.15.4.23.63.23.07,0,.13,0,.2-.02l10-2c.47-.09.8-.5.8-.98V5c0-.48-.34-.89-.8-.98Zm-15.2,13.98V6h4v12h-4Zm8-5c-.55,0-1-.45-1-1s.45-1,1-1,1,.45,1,1-.45,1-1,1Z"></path>
    </svg>
  );
};
export const Clock = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 2 20 20" className={className}>
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m1 10c0 .36-.19.69-.5.87l-5.2 3-1-1.73 4.7-2.71V6.01h2v6Z"></path>
    </svg>
  );
};
export const MinusCircle = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 2 20 20" className={className}>
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m5 11H7v-2h10z"></path>
    </svg>
  );
};
export const Transfer = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 5 20 14" className={className}>
      <path d="M17 14 9 14 9 16 17 16 17 19 22 15 17 11 17 14z"></path>
      <path d="M15 10 15 8 7 8 7 5 2 9 7 13 7 10 15 10z"></path>
    </svg>
  );
};
export const Layers = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 2 20 20" className={className}>
      <path d="m21.49,7.13L12.49,2.13c-.3-.17-.67-.17-.97,0L2.51,7.13c-.32.18-.51.51-.51.87s.2.7.51.87l9,5c.15.08.32.13.49.13s.33-.04.49-.13l9-5c.32-.18.51-.51.51-.87s-.2-.7-.51-.87Zm-9.49,4.73l-6.94-3.86,6.94-3.86,6.94,3.86-6.94,3.86Z"></path>
      <path d="m12,18c.17,0,.33-.04.49-.13l9-5-.97-1.75-8.51,4.73L3.49,11.13l-.97,1.75,9,5c.15.08.32.13.49.13Z"></path>
      <path d="m11.51,21.87c.15.08.32.13.49.13s.33-.04.49-.13l9-5-.97-1.75-8.51,4.73L3.49,15.13l-.97,1.75,9,5Z"></path>
    </svg>
  );
};
export const ChartLine = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 2 20 20" className={className}>
      <path d="M4 2H2v19c0 .55.45 1 1 1h19v-2H4z"></path>
      <path d="M15.4 12.8c.4.3.96.26 1.31-.09l5-5L20.3 6.3l-4.39 4.39-3.31-2.48c-.4-.3-.96-.26-1.31.09l-6 6 1.41 1.41 5.39-5.39z"></path>
    </svg>
  );
};
export const CallPark = ({ className }: IconProps) => {
  return (
    <svg fill="none" viewBox="2 2 12 11.99" className={className}>
      <g fill="currentColor">
        <path d="m10.5 2c-.2761 0-.5.22386-.5.5v5c0 .27614.2239.5.5.5s.5-.22386.5-.5v-1.5h1c1.1046 0 2-.89543 2-2s-.8954-2-2-2zm1.5 3h-1v-2h1c.5523 0 1 .44772 1 1s-.4477 1-1 1z"></path>
        <path d="m4.37408 2.11971c.85103-.31994 1.80531.0651 2.196.88606l.56653 1.19041c.26256.55171.16424 1.20754-.24856 1.65801l-1.31648 1.43659c.01574.06137.03557.13323.06012.21333.0856.27931.22605.65066.44467 1.02495.21663.37092.47612.67439.68384.88627.06067.06189.11631.11534.16435.15975l1.87765-.48899c.52602-.13699 1.08498.02131 1.4611.41377l.7753.80914c.6723.7016.6443 1.8164-.0622 2.4834l-.2961.2794c-1.12592 1.0629-2.87964 1.2899-4.13457.2468-.9398-.7812-2.06827-1.8796-2.91771-3.2128-.94084-1.4767-1.3801-3.23057-1.58819-4.55066-.23733-1.50552.72074-2.82884 2.07109-3.33649z"></path>
      </g>
    </svg>
  );
};
export const Send = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <path
        d="M15.5271 13.0598L16.9575 8.76864C18.2071 5.01998 18.8318 3.14565 17.8424 2.15626C16.853 1.16687 14.9787 1.79165 11.2301 3.0412L6.93895 4.47157C3.91343 5.48008 2.40066 5.98433 1.97078 6.72379C1.56182 7.42724 1.56182 8.29604 1.97078 8.9995C2.40066 9.73895 3.91342 10.2432 6.93895 11.2517C7.31391 11.3767 7.73574 11.2875 8.01651 11.0093L12.6045 6.46376C12.8627 6.20804 13.2792 6.20998 13.5349 6.46809C13.7907 6.72621 13.7887 7.14276 13.5306 7.39849L9.01666 11.8706C8.70719 12.1772 8.60923 12.6465 8.74699 13.0598C9.75549 16.0853 10.2597 17.598 10.9992 18.0279C11.7027 18.4369 12.5715 18.4369 13.2749 18.0279C14.0144 17.598 14.5186 16.0853 15.5271 13.0598Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UserCirclePlus = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M11.9997 7.12501C12.8155 7.12501 13.613 7.36694 14.2914 7.8202C14.9697 8.27346 15.4984 8.9177 15.8107 9.67144C16.1229 10.4252 16.2046 11.2546 16.0454 12.0548C15.8862 12.8549 15.4934 13.5899 14.9165 14.1668C14.3396 14.7437 13.6046 15.1366 12.8044 15.2957C12.0042 15.4549 11.1748 15.3732 10.4211 15.061C9.66734 14.7488 9.02311 14.2201 8.56985 13.5417C8.11659 12.8634 7.87466 12.0659 7.87466 11.25C7.87466 10.156 8.30926 9.10678 9.08284 8.33319C9.85643 7.55961 10.9056 7.12501 11.9997 7.12501ZM16.4997 6.00001H17.9997V7.50001C17.9997 7.69892 18.0787 7.88969 18.2193 8.03034C18.36 8.17099 18.5507 8.25001 18.7497 8.25001C18.9486 8.25001 19.1393 8.17099 19.28 8.03034C19.4206 7.88969 19.4997 7.69892 19.4997 7.50001V6.00001H20.9997C21.1986 6.00001 21.3893 5.92099 21.53 5.78034C21.6706 5.63969 21.7497 5.44892 21.7497 5.25001C21.7497 5.0511 21.6706 4.86033 21.53 4.71968C21.3893 4.57903 21.1986 4.50001 20.9997 4.50001H19.4997V3.00001C19.4997 2.8011 19.4206 2.61033 19.28 2.46968C19.1393 2.32903 18.9486 2.25001 18.7497 2.25001C18.5507 2.25001 18.36 2.32903 18.2193 2.46968C18.0787 2.61033 17.9997 2.8011 17.9997 3.00001V4.50001H16.4997C16.3007 4.50001 16.11 4.57903 15.9693 4.71968C15.8287 4.86033 15.7497 5.0511 15.7497 5.25001C15.7497 5.44892 15.8287 5.63969 15.9693 5.78034C16.11 5.92099 16.3007 6.00001 16.4997 6.00001ZM20.7512 9.76032C20.555 9.79315 20.3799 9.90256 20.2644 10.0645C20.1489 10.2264 20.1025 10.4276 20.1353 10.6238C20.2114 11.0786 20.2497 11.5389 20.2497 12C20.2514 14.0196 19.5092 15.969 18.1647 17.4759C17.6191 16.6853 16.9265 16.007 16.1247 15.4781C16.0562 15.4327 15.9747 15.4111 15.8927 15.4165C15.8107 15.4219 15.7328 15.4541 15.6709 15.5081C14.6519 16.3898 13.3495 16.8751 12.002 16.8751C10.6545 16.8751 9.35209 16.3898 8.3331 15.5081C8.27083 15.453 8.192 15.4201 8.10901 15.4147C8.02602 15.4093 7.94358 15.4316 7.87466 15.4781C7.07156 16.0065 6.37794 16.6848 5.83185 17.4759C4.77674 16.287 4.08758 14.8185 3.84728 13.2472C3.60698 11.6758 3.82576 10.0685 4.4773 8.61854C5.12885 7.16858 6.18541 5.93773 7.51992 5.07403C8.85442 4.21033 10.41 3.75055 11.9997 3.75001C12.4608 3.74994 12.9211 3.78819 13.3759 3.86439C13.5712 3.8952 13.7708 3.84766 13.9312 3.73209C14.0916 3.61653 14.1999 3.4423 14.2325 3.24731C14.2651 3.05231 14.2195 2.85232 14.1054 2.69083C13.9913 2.52935 13.8181 2.41944 13.6234 2.38501C11.5866 2.04237 9.49367 2.35589 7.64669 3.2803C5.79972 4.20471 4.29431 5.69218 3.34783 7.52795C2.40135 9.36371 2.06277 11.4528 2.38098 13.4935C2.69919 15.5342 3.65772 17.421 5.11817 18.8815C6.57863 20.342 8.46543 21.3005 10.5062 21.6187C12.5469 21.9369 14.636 21.5983 16.4717 20.6518C18.3075 19.7054 19.795 18.2 20.7194 16.353C21.6438 14.506 21.9573 12.413 21.6147 10.3763C21.5818 10.1801 21.4724 10.005 21.3105 9.88948C21.1486 9.77397 20.9474 9.72751 20.7512 9.76032Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const ImPhoneHangUp = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      version="1.1"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M15.897 9c0.125 0.867 0.207 2.053-0.182 2.507-0.643 0.751-4.714 0.751-4.714-0.751 0-0.756 0.67-1.252 0.027-2.003-0.632-0.738-1.766-0.75-3.027-0.751s-2.394 0.012-3.027 0.751c-0.643 0.751 0.027 1.247 0.027 2.003 0 1.501-4.071 1.501-4.714 0.751-0.389-0.454-0.307-1.64-0.182-2.507 0.096-0.579 0.339-1.203 1.118-2 0-0 0-0 0-0 1.168-1.090 2.935-1.98 6.716-2v-0c0.021 0 0.042 0 0.063 0s0.041-0 0.063-0v0c3.781 0.019 5.548 0.91 6.716 2 0 0 0 0 0 0 0.778 0.797 1.022 1.421 1.118 2z"></path>
    </svg>
  );
};
export const RiChatVoiceLine = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22H2L4.92893 19.0711C3.11929 17.2614 2 14.7614 2 12ZM6.82843 20H12C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 14.1524 4.85124 16.1649 6.34315 17.6569L7.75736 19.0711L6.82843 20ZM11 6H13V18H11V6ZM7 9H9V15H7V9ZM15 9H17V15H15V9Z"></path>
    </svg>
  );
};
export const FaPhone = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 512 512"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M493.4 24.6l-104-24c-11.3-2.6-22.9 3.3-27.5 13.9l-48 112c-4.2 9.8-1.4 21.3 6.9 28l60.6 49.6c-36 76.7-98.9 140.5-177.2 177.2l-49.6-60.6c-6.8-8.3-18.2-11.1-28-6.9l-112 48C3.9 366.5-2 378.1.6 389.4l24 104C27.1 504.2 36.7 512 48 512c256.1 0 464-207.5 464-464 0-11.2-7.7-20.9-18.6-23.4z"></path>
    </svg>
  );
};
export const FilterIcon = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="22"
      viewBox="0 0 24 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.2159 16.332H13.7684V14.5547H10.2159V16.332ZM3.99902 5.66797V7.44531H19.9853V5.66797H3.99902ZM6.6634 11.8887H17.3209V10.1113H6.6634V11.8887Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CallForward = ({ className }: IconProps) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={className}>
      <g opacity="0.9">
        <path
          d="M8.36726 4.42884L8.90811 5.39795C9.39619 6.27252 9.20026 7.4198 8.43153 8.18853C8.43153 8.18853 8.43153 8.18853 8.43153 8.18853C8.43141 8.18865 7.49919 9.12109 9.1897 10.8116C10.8796 12.5015 11.812 11.5706 11.8128 11.5698C11.8128 11.5698 11.8128 11.5698 11.8128 11.5697C12.5815 10.801 13.7288 10.6051 14.6034 11.0932L15.5725 11.634C16.8931 12.3711 17.049 14.2231 15.8882 15.3839C15.1907 16.0814 14.3363 16.6241 13.3917 16.6599C11.8016 16.7202 9.10117 16.3178 6.39236 13.6089C3.68354 10.9001 3.28112 8.19972 3.3414 6.6096C3.37721 5.66503 3.91994 4.81056 4.61744 4.11306C5.77823 2.95227 7.63025 3.10823 8.36726 4.42884Z"
          fill="currentColor"
        />
        <path
          d="M12.321 5.70403L17.0343 5.62173ZM17.0343 5.62173L15.2976 7.42008ZM17.0343 5.62173L15.2359 3.88509Z"
          fill="currentColor"
        />
        <path
          d="M12.321 5.70403L17.0343 5.62173M17.0343 5.62173L15.2976 7.42008M17.0343 5.62173L15.2359 3.88509"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
export const Graph = ({ className }: IconProps) => {
  return (
    <svg className={className} width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z" />
    </svg>
  );
};
export const Notification = ({ className }: IconProps) => {
  return (
    <svg className={className} width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 12.59V10c0-3.22-2.18-5.93-5.14-6.74C13.57 2.52 12.85 2 12 2s-1.56.52-1.86 1.26C7.18 4.08 5 6.79 5 10v2.59L3.29 14.3a1 1 0 0 0-.29.71v2c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-2c0-.27-.11-.52-.29-.71zM14.82 20H9.18c.41 1.17 1.51 2 2.82 2s2.41-.83 2.82-2"></path>
    </svg>
  );
};
export const CallWhisper = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.5562 15.9062L14.1007 16.359C14.1007 16.359 13.0181 17.4355 10.0631 14.4972C7.10812 11.559 8.1907 10.4826 8.1907 10.4826L8.47752 10.1974C9.18407 9.49484 9.25068 8.36691 8.63424 7.54348L7.37326 5.85908C6.61028 4.83992 5.13596 4.70529 4.26145 5.57483L2.69185 7.13552C2.25823 7.56668 1.96765 8.12559 2.00289 8.74561C2.09304 10.3318 2.81071 13.7447 6.81536 17.7266C11.0621 21.9492 15.0468 22.117 16.6763 21.9651C17.1917 21.9171 17.6399 21.6546 18.0011 21.2954L19.4217 19.883C20.3806 18.9295 20.1102 17.2949 18.8833 16.628L16.9728 15.5894C16.1672 15.1515 15.1858 15.2801 14.5562 15.9062Z"
        fill="currentColor"
      />
      <line
        x1="11.4158"
        y1="8.00601"
        x2="13.4989"
        y2="1.9512"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="14.1315"
        y1="10.1363"
        x2="18.7707"
        y2="5.72294"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <line
        x1="16.3452"
        y1="12.8453"
        x2="22.2017"
        y2="10.2565"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
};
export const CallIntersection = ({ className }: IconProps) => {
  return (
    <svg
      data-v-39ea7f52=""
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className={className}
    >
      <path d="m16 3 4 4-4 4"></path>
      <path d="M20 7H4"></path>
      <path d="m8 21-4-4 4-4"></path>
      <path d="M4 17h16"></path>
    </svg>
  );
};
export const CallListen = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15.5562 16.9062L15.1007 17.359C15.1007 17.359 14.0181 18.4355 11.0631 15.4972C8.10812 12.559 9.1907 11.4826 9.1907 11.4826L9.47752 11.1974C10.1841 10.4948 10.2507 9.36691 9.63424 8.54348L8.37326 6.85908C7.61028 5.83992 6.13596 5.70529 5.26145 6.57483L3.69185 8.13552C3.25823 8.56668 2.96765 9.12559 3.00289 9.74561C3.09304 11.3318 3.81071 14.7447 7.81536 18.7266C12.0621 22.9492 16.0468 23.117 17.6763 22.9651C18.1917 22.9171 18.6399 22.6546 19.0011 22.2954L20.4217 20.883C21.3806 19.9295 21.1102 18.2949 19.8833 17.628L17.9728 16.5894C17.1672 16.1515 16.1858 16.2801 15.5562 16.9062Z"
        fill="currentColor"
      />
      <path
        d="M9.39844 1.64844C9.39844 1.64844 11.0165 2.00457 12.836 4.35179C14.6555 6.69901 14.597 8.35478 14.597 8.35478"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.02344 4.625C9.02344 4.625 9.69276 4.91137 10.6025 6.08498C11.5123 7.25859 11.6227 7.97817 11.6227 7.97817"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
export const CallBarge = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M14.5562 15.9062L14.1007 16.359C14.1007 16.359 13.0181 17.4355 10.0631 14.4972C7.10812 11.559 8.1907 10.4826 8.1907 10.4826L8.47752 10.1974C9.18407 9.49484 9.25068 8.36691 8.63424 7.54348L7.37326 5.85908C6.61028 4.83992 5.13596 4.70529 4.26145 5.57483L2.69185 7.13552C2.25823 7.56668 1.96765 8.12559 2.00289 8.74561C2.09304 10.3318 2.81071 13.7447 6.81536 17.7266C11.0621 21.9492 15.0468 22.117 16.6763 21.9651C17.1917 21.9171 17.6399 21.6546 18.0011 21.2954L19.4217 19.883C20.3806 18.9295 20.1102 17.2949 18.8833 16.628L16.9728 15.5894C16.1672 15.1515 15.1858 15.2801 14.5562 15.9062Z"
        fill="currentColor"
      />
      <path
        d="M17 13C19.7614 13 22 10.7614 22 8C22 5.23858 19.7614 3 17 3C14.2386 3 12 5.23858 12 8C12 8.79984 12.1878 9.55582 12.5217 10.2262C12.6105 10.4044 12.64 10.608 12.5886 10.8003L12.2908 11.9133C12.1615 12.3965 12.6035 12.8385 13.0867 12.7092L14.1997 12.4114C14.392 12.36 14.5956 12.3895 14.7738 12.4783C15.4442 12.8122 16.2002 13 17 13Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M15 8H19M17 10L17 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};
export const FileDetail = ({ className }: IconProps) => {
  return (
    <svg className={className} width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path d="m19.94 7.68-.03-.09a.8.8 0 0 0-.2-.29l-5-5c-.09-.09-.19-.15-.29-.2l-.09-.03a.8.8 0 0 0-.26-.05c-.02 0-.04-.01-.06-.01H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-12s-.01-.04-.01-.06c0-.09-.02-.17-.05-.26ZM6 20V4h7v4c0 .55.45 1 1 1h4v11z"></path>
      <path d="M8 11h8v2H8zM8 15h8v2H8zM8 7h3v2H8z"></path>
    </svg>
  );
};
export const CallCancelLine = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="1 1 22 22"
    >
      <path d="m16 2 6 6"></path>
      <path d="m22 2-6 6"></path>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
    </svg>
  );
};
export const RemoveAssignmentLine = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 21a8 8 0 0 1 11.873-7" />
      <circle cx="10" cy="8" r="5" />
      <path d="m17 17 5 5" />
      <path d="m22 17-5 5" />
    </svg>
  );
};
export const ReleaseNumber = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 12H3" />
      <path d="M16 6H3" />
      <path d="M16 18H3" />
      <path d="M21 12h-6" />
    </svg>
  );
};
export const AssignNumberLine = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 12H3" />
      <path d="M16 6H3" />
      <path d="M16 18H3" />
      <path d="M18 9v6" />
      <path d="M21 12h-6" />
    </svg>
  );
};
export const PhoneIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className={className}>
      <path
        d="M11.6775 11.5893L12.0742 11.1718L11.1257 10.2704L10.729 10.6897L11.6775 11.5893ZM13.381 10.9957L15.0461 11.9546L15.6991 10.8204L14.0331 9.8615L13.381 10.9957ZM15.3678 13.9413L14.1299 15.2446L15.0775 16.146L16.3154 14.8427L15.3678 13.9413ZM13.3845 15.663C12.1335 15.7859 8.86865 15.6813 5.32572 11.952L4.37809 12.8516C8.23922 16.9166 11.9225 17.1223 13.5126 16.9646L13.3845 15.663ZM5.32572 11.952C1.94669 8.39434 1.38003 5.39289 1.30941 4.07654L0.00348068 4.14715C0.0906591 5.7599 0.774138 9.05774 4.37809 12.8516L5.32572 11.952ZM6.52529 6.16526L6.77463 5.90287L5.827 5.00147L5.57679 5.26474L6.52529 6.16526ZM6.97165 2.62507L5.87233 1.07073L4.80439 1.82567L5.90284 3.38001L6.97165 2.62507ZM2.15068 0.734234L0.783727 2.17612L1.73223 3.07664L3.10093 1.63563L2.15068 0.734234ZM6.05105 5.71457C5.89415 5.56336 5.73577 5.4137 5.57592 5.26561L5.57418 5.26736L5.57156 5.26997L5.52797 5.32053C5.44261 5.4337 5.375 5.55923 5.32746 5.69277C5.24203 5.93251 5.1967 6.24982 5.25423 6.6456C5.36757 7.42321 5.87756 8.46844 7.20877 9.87109L8.15728 8.9697C6.91237 7.65945 6.6055 6.85308 6.54796 6.45556C6.52006 6.26377 6.54796 6.16352 6.5593 6.13126L6.56627 6.1147L6.54186 6.14696L6.52617 6.16439C6.52617 6.16439 6.52442 6.16439 6.05105 5.71457ZM7.20877 9.87109C8.5365 11.2694 9.53905 11.8177 10.3036 11.9424C10.6968 12.006 11.015 11.9546 11.2556 11.8596C11.389 11.8075 11.513 11.7339 11.6226 11.6416L11.654 11.612L11.6662 11.5998L11.6723 11.5946L11.6749 11.5919L11.6758 11.5902C11.6758 11.5902 11.6775 11.5893 11.2033 11.1386C10.729 10.6888 10.7299 10.6871 10.7299 10.6871L10.7317 10.6862L10.7334 10.6836L10.7378 10.6792L10.7465 10.6705L10.7787 10.6426C10.7874 10.6379 10.7863 10.6382 10.7752 10.6435C10.7578 10.6504 10.6793 10.6783 10.5137 10.6513C10.1632 10.5938 9.40654 10.2852 8.15728 8.9697L7.20877 9.87109ZM5.87233 1.07073C4.98834 -0.179365 3.22036 -0.391201 2.15156 0.735106L3.09831 1.63563C3.55426 1.15616 4.35804 1.19365 4.80439 1.82567L5.87233 1.07073ZM1.30941 4.07654C1.29023 3.72784 1.4428 3.38001 1.73223 3.07664L0.783727 2.17612C0.316451 2.66778 -0.0392367 3.35037 0.00348068 4.14715L1.30941 4.07654ZM14.129 15.2455C13.8858 15.5018 13.6321 15.6386 13.3845 15.663L13.5126 16.9646C14.1639 16.9009 14.6913 16.5531 15.0775 16.146L14.129 15.2455ZM6.77463 5.90287C7.61851 5.01455 7.67779 3.62497 6.97165 2.62507L5.90284 3.38001C6.27073 3.90045 6.21494 4.59349 5.827 5.00147L6.77463 5.90287ZM15.0461 11.9546C15.7618 12.3669 15.9022 13.379 15.3678 13.9413L16.3154 14.8427C17.4531 13.6449 17.1218 11.6399 15.6991 10.8204L15.0461 11.9546ZM12.0742 11.1718C12.4098 10.8178 12.9338 10.7385 13.381 10.9957L14.0331 9.8615C13.075 9.31055 11.8885 9.47008 11.1257 10.2721L12.0742 11.1718Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const InboxIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="15" viewBox="0 0 17 15" fill="none" className={className}>
      <path
        d="M12.2247 0.0820312C12.517 0.0821425 12.8043 0.157608 13.0589 0.30114C13.3135 0.444672 13.5268 0.651423 13.6782 0.901431L13.7453 1.02213L16.7305 6.99338C16.8778 7.28775 16.9667 7.60786 16.9923 7.93603L17 8.13323V12.832C17.0001 13.2609 16.8382 13.674 16.5465 13.9885C16.2549 14.303 15.8552 14.4956 15.4275 14.5278L15.3 14.532H1.7C1.27111 14.5322 0.858019 14.3702 0.543535 14.0786C0.229051 13.7869 0.0364176 13.3872 0.00425088 12.9595L7.79302e-07 12.832V8.13323C-0.000256608 7.80399 0.0632457 7.47782 0.187001 7.17273L0.269451 6.99253L3.25465 1.02213C3.38535 0.760379 3.5814 0.536788 3.82382 0.37299C4.06624 0.209192 4.34683 0.110731 4.63845 0.0871313L4.7753 0.0820312H12.2247ZM5.1 8.58203H1.7V12.832H15.3V8.58203H11.9V9.00703C11.9 9.34518 11.7657 9.66948 11.5266 9.90859C11.2875 10.1477 10.9632 10.282 10.625 10.282H6.375C6.03685 10.282 5.71255 10.1477 5.47344 9.90859C5.23433 9.66948 5.1 9.34518 5.1 9.00703V8.58203ZM12.2247 1.78203H4.7753L2.2253 6.88203H5.525C5.84195 6.88205 6.14753 7.00011 6.38216 7.21321C6.61678 7.4263 6.76362 7.71914 6.79405 8.03463L6.8 8.15703V8.58203H10.2V8.15703C10.2 7.84008 10.3181 7.5345 10.5312 7.29987C10.7443 7.06525 11.0371 6.91841 11.3526 6.88798L11.475 6.88203H14.7747L12.2247 1.78203Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const ContactIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.53467 6.12918C5.53467 5.34278 5.84706 4.58859 6.40313 4.03252C6.9592 3.47646 7.71339 3.16406 8.49978 3.16406C9.28618 3.16406 10.0404 3.47646 10.5964 4.03252C11.1525 4.58859 11.4649 5.34278 11.4649 6.12918C11.4649 6.91558 11.1525 7.66977 10.5964 8.22583C10.0404 8.7819 9.28618 9.0943 8.49978 9.0943C7.71339 9.0943 6.9592 8.7819 6.40313 8.22583C5.84706 7.66977 5.53467 6.91558 5.53467 6.12918ZM8.49978 4.35011C8.02795 4.35011 7.57543 4.53755 7.24179 4.87119C6.90815 5.20483 6.72071 5.65734 6.72071 6.12918C6.72071 6.60102 6.90815 7.05353 7.24179 7.38717C7.57543 7.72081 8.02795 7.90825 8.49978 7.90825C8.97162 7.90825 9.42414 7.72081 9.75778 7.38717C10.0914 7.05353 10.2789 6.60102 10.2789 6.12918C10.2789 5.65734 10.0914 5.20483 9.75778 4.87119C9.42414 4.53755 8.97162 4.35011 8.49978 4.35011Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 8.5C0 3.80563 3.80563 0 8.5 0C13.1944 0 17 3.80563 17 8.5C17 13.1944 13.1944 17 8.5 17C3.80563 17 0 13.1944 0 8.5ZM8.5 1.18605C7.05515 1.18611 5.64269 1.61412 4.44083 2.41606C3.23897 3.218 2.30155 4.35795 1.74686 5.69208C1.19216 7.02621 1.04504 8.49474 1.32405 9.91239C1.60307 11.33 2.29571 12.6333 3.3146 13.6577C3.45693 12.8884 3.73763 12.1633 4.29981 11.5798C5.14191 10.7068 6.48688 10.2791 8.5 10.2791C10.5131 10.2791 11.8581 10.7068 12.6994 11.5798C13.2624 12.1633 13.5423 12.8892 13.6854 13.6585C14.7046 12.6341 15.3974 11.3308 15.6766 9.91302C15.9558 8.49523 15.8087 7.02652 15.254 5.69223C14.6993 4.35794 13.7617 3.21787 12.5597 2.41589C11.3577 1.61391 9.94501 1.18596 8.5 1.18605ZM12.6069 14.5528C12.5262 13.5945 12.3183 12.8923 11.8462 12.4029C11.3323 11.8707 10.3811 11.4651 8.5 11.4651C6.61893 11.4651 5.66772 11.8707 5.15377 12.4029C4.68172 12.8931 4.47377 13.5945 4.39312 14.5536C5.60398 15.3776 7.03537 15.8168 8.5 15.814C9.96471 15.8166 11.3961 15.3771 12.6069 14.5528Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const DepartmentIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="15" viewBox="0 0 17 15" fill="none" className={className}>
      <path
        d="M0 12.05C0 11.5542 0.112818 11.0986 0.338455 10.6833C0.564091 10.2679 0.863394 9.95059 1.23636 9.73126C2.03485 9.27917 2.84621 8.94026 3.67045 8.71451C4.4947 8.48876 5.33182 8.37559 6.18182 8.37501C7.03182 8.37443 7.86894 8.48759 8.69318 8.71451C9.51742 8.94143 10.3288 9.28034 11.1273 9.73126C11.5008 9.95001 11.8003 10.2673 12.026 10.6833C12.2516 11.0992 12.3642 11.5548 12.3636 12.05V12.75C12.3636 13.2313 12.2124 13.6434 11.91 13.9864C11.6077 14.3294 11.2437 14.5006 10.8182 14.5H1.54545C1.12045 14.5 0.756758 14.3288 0.454364 13.9864C0.15197 13.644 0.000515151 13.2318 0 12.75V12.05ZM15.4545 14.5H13.4841C13.6258 14.2375 13.7321 13.9569 13.8032 13.6583C13.8743 13.3596 13.9096 13.0568 13.9091 12.75V11.875C13.9091 11.2333 13.7515 10.617 13.4362 10.0261C13.1209 9.43522 12.6732 8.92859 12.0932 8.50626C12.75 8.59376 13.3682 8.74338 13.9477 8.95513C14.5273 9.16688 15.0682 9.42559 15.5705 9.73126C16.0341 10.0229 16.3883 10.3473 16.633 10.7043C16.8777 11.0613 17 11.4515 17 11.875V12.75C17 13.2313 16.8488 13.6434 16.5464 13.9864C16.244 14.3294 15.8801 14.5006 15.4545 14.5ZM6.18182 7.50001C5.33182 7.50001 4.60417 7.1573 3.99886 6.47189C3.39356 5.78647 3.09091 4.96252 3.09091 4.00002C3.09091 3.03752 3.39356 2.21356 3.99886 1.52815C4.60417 0.84273 5.33182 0.500022 6.18182 0.500022C7.03182 0.500022 7.75947 0.84273 8.36477 1.52815C8.97008 2.21356 9.27273 3.03752 9.27273 4.00002C9.27273 4.96252 8.97008 5.78647 8.36477 6.47189C7.75947 7.1573 7.03182 7.50001 6.18182 7.50001ZM13.9091 4.00002C13.9091 4.96252 13.6064 5.78647 13.0011 6.47189C12.3958 7.1573 11.6682 7.50001 10.8182 7.50001C10.6765 7.50001 10.4962 7.48193 10.2773 7.44576C10.0583 7.40959 9.87803 7.36934 9.73636 7.32501C10.0841 6.85835 10.3515 6.34064 10.5385 5.77189C10.7255 5.20314 10.8187 4.61252 10.8182 4.00002C10.8177 3.38752 10.7244 2.79689 10.5385 2.22814C10.3525 1.6594 10.0851 1.14169 9.73636 0.675022C9.91667 0.602105 10.097 0.554564 10.2773 0.532398C10.4576 0.510231 10.6379 0.499439 10.8182 0.500022C11.6682 0.500022 12.3958 0.84273 13.0011 1.52815C13.6064 2.21356 13.9091 3.03752 13.9091 4.00002ZM1.54545 12.75H10.8182V12.05C10.8182 11.8896 10.7829 11.7438 10.7123 11.6125C10.6417 11.4813 10.5482 11.3792 10.4318 11.3063C9.73636 10.9125 9.03447 10.6173 8.32614 10.4208C7.6178 10.2242 6.90303 10.1256 6.18182 10.125C5.46061 10.1244 4.74583 10.223 4.0375 10.4208C3.32917 10.6185 2.62727 10.9137 1.93182 11.3063C1.81591 11.3792 1.72241 11.4813 1.65132 11.6125C1.58023 11.7438 1.54494 11.8896 1.54545 12.05V12.75ZM6.18182 5.75001C6.60682 5.75001 6.97077 5.57881 7.27368 5.23639C7.57659 4.89397 7.72779 4.48185 7.72727 4.00002C7.72676 3.51818 7.57556 3.10635 7.27368 2.76452C6.9718 2.42269 6.60785 2.25119 6.18182 2.25002C5.75579 2.24885 5.39209 2.42035 5.09073 2.76452C4.78936 3.10868 4.63791 3.52052 4.63636 4.00002C4.63482 4.47952 4.78627 4.89164 5.09073 5.23639C5.39518 5.58114 5.75888 5.75235 6.18182 5.75001Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const GreetingIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="21" viewBox="0 0 17 21" fill="none" className={className}>
      <path
        d="M16.5093 0.25194C16.3564 0.137596 16.1783 0.0592099 15.9889 0.0229364C15.7995 -0.0133371 15.604 -0.00651087 15.4178 0.0428793L5.79164 2.55441C5.45764 2.64149 5.16291 2.83382 4.9538 3.10118C4.74469 3.36855 4.63304 3.69577 4.63642 4.03143V14.6251C4.63642 14.941 4.42586 15.2138 4.09986 15.3202L4.09407 15.3226L1.58272 16.1663C0.622131 16.478 8.96136e-05 17.3438 8.96136e-05 18.3708C-0.00342821 18.7885 0.0966724 19.2009 0.291938 19.5732C0.487204 19.9455 0.771901 20.2667 1.12199 20.5097C1.57281 20.8276 2.11552 20.9991 2.67274 21C2.96426 20.9995 3.25377 20.9531 3.52998 20.8627L3.54833 20.8566L4.6031 20.4844C5.06064 20.3361 5.4589 20.0526 5.74203 19.6736C6.02516 19.2945 6.17896 18.839 6.18187 18.3708V8.43341C6.18187 8.0917 6.41224 7.8142 6.76914 7.72702L6.77928 7.7242L15.2131 5.53798C15.2416 5.53084 15.2714 5.53011 15.3002 5.53585C15.329 5.54159 15.3561 5.55365 15.3794 5.5711C15.4027 5.58856 15.4216 5.61095 15.4346 5.63657C15.4476 5.66218 15.4544 5.69035 15.4545 5.71891V12.3718C15.4545 12.6882 15.2493 12.9521 14.918 13.0599L14.9059 13.0641L12.4482 13.913C11.9702 14.0656 11.5547 14.3618 11.2616 14.7588C10.9686 15.1558 10.8133 15.633 10.8182 16.1213C10.8139 16.5403 10.9136 16.9541 11.1089 17.3278C11.3041 17.7015 11.5893 18.024 11.9401 18.2682C12.2836 18.5092 12.6819 18.6663 13.1012 18.7263C13.5205 18.7862 13.9485 18.7473 14.3491 18.6127L14.3664 18.6071L15.4212 18.2344C15.8787 18.0862 16.277 17.8028 16.5601 17.4238C16.8432 17.0449 16.997 16.5894 17 16.1213V1.21896C17.001 1.03189 16.9573 0.847137 16.8721 0.679309C16.7869 0.511481 16.6627 0.365171 16.5093 0.25194Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const GreetingIcon2 = ({ className }: IconProps) => {
  return (
    <svg
      width="20"
      height="21"
      viewBox="0 0 20 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5.83326 2.62391H14.1665C14.3875 2.62391 14.5995 2.53176 14.7557 2.36773C14.912 2.20371 14.9998 1.98124 14.9998 1.74927C14.9998 1.5173 14.912 1.29484 14.7557 1.13081C14.5995 0.966784 14.3875 0.874636 14.1665 0.874636H5.83326C5.61225 0.874636 5.40029 0.966784 5.24401 1.13081C5.08773 1.29484 4.99994 1.5173 4.99994 1.74927C4.99994 1.98124 5.08773 2.20371 5.24401 2.36773C5.40029 2.53176 5.61225 2.62391 5.83326 2.62391ZM0 1.74927C0 2.21321 0.175593 2.65814 0.488149 2.98619C0.800706 3.31424 1.22462 3.49854 1.66665 3.49854C2.10867 3.49854 2.53259 3.31424 2.84514 2.98619C3.1577 2.65814 3.33329 2.21321 3.33329 1.74927C3.33329 1.28534 3.1577 0.840402 2.84514 0.51235C2.53259 0.184298 2.10867 0 1.66665 0C1.22462 0 0.800706 0.184298 0.488149 0.51235C0.175593 0.840402 0 1.28534 0 1.74927ZM4.99994 6.99708C4.99994 7.22905 5.08773 7.45152 5.24401 7.61555C5.40029 7.77957 5.61225 7.87172 5.83326 7.87172H14.1665C14.3875 7.87172 14.5995 7.77957 14.7557 7.61555C14.912 7.45152 14.9998 7.22905 14.9998 6.99708C14.9998 6.76512 14.912 6.54265 14.7557 6.37862C14.5995 6.2146 14.3875 6.12245 14.1665 6.12245H5.83326C5.61225 6.12245 5.40029 6.2146 5.24401 6.37862C5.08773 6.54265 4.99994 6.76512 4.99994 6.99708ZM0 6.99708C0 7.46102 0.175593 7.90595 0.488149 8.23401C0.800706 8.56206 1.22462 8.74636 1.66665 8.74636C2.10867 8.74636 2.53259 8.56206 2.84514 8.23401C3.1577 7.90595 3.33329 7.46102 3.33329 6.99708C3.33329 6.53315 3.1577 6.08821 2.84514 5.76016C2.53259 5.43211 2.10867 5.24781 1.66665 5.24781C1.22462 5.24781 0.800706 5.43211 0.488149 5.76016C0.175593 6.08821 0 6.53315 0 6.99708ZM8.33323 11.3703H5.83326C5.61225 11.3703 5.40029 11.4624 5.24401 11.6264C5.08773 11.7905 4.99994 12.0129 4.99994 12.2449C4.99994 12.4769 5.08773 12.6993 5.24401 12.8634C5.40029 13.0274 5.61225 13.1195 5.83326 13.1195H8.33323C8.55424 13.1195 8.7662 13.0274 8.92248 12.8634C9.07876 12.6993 9.16655 12.4769 9.16655 12.2449C9.16655 12.0129 9.07876 11.7905 8.92248 11.6264C8.7662 11.4624 8.55424 11.3703 8.33323 11.3703ZM0 12.2449C0 12.7088 0.175593 13.1538 0.488149 13.4818C0.800706 13.8099 1.22462 13.9942 1.66665 13.9942C2.10867 13.9942 2.53259 13.8099 2.84514 13.4818C3.1577 13.1538 3.33329 12.7088 3.33329 12.2449C3.33329 11.781 3.1577 11.336 2.84514 11.008C2.53259 10.6799 2.10867 10.4956 1.66665 10.4956C1.22462 10.4956 0.800706 10.6799 0.488149 11.008C0.175593 11.336 0 11.781 0 12.2449ZM19.9998 17.0991V11.1166C20.004 10.8569 19.9532 10.5995 19.8508 10.3631C19.7485 10.1266 19.5973 9.917 19.4082 9.74951C19.2191 9.58201 18.9968 9.46081 18.7576 9.39471C18.5183 9.32861 18.2679 9.31926 18.0248 9.36735L13.0248 10.3469C12.6381 10.4233 12.2896 10.6408 12.041 10.9609C11.7924 11.2811 11.6597 11.6833 11.6665 12.0962V16.4082C11.6661 16.4706 11.6421 16.5304 11.5999 16.5743C11.578 16.5936 11.5528 16.6081 11.5257 16.6171C11.4985 16.6261 11.4699 16.6294 11.4415 16.6268H11.2499C10.9632 16.6296 10.68 16.692 10.4165 16.8105C9.97852 17.0118 9.61984 17.3652 9.40068 17.8113C9.18153 18.2574 9.11525 18.769 9.21297 19.2603C9.31069 19.7516 9.56647 20.1926 9.93736 20.5094C10.3082 20.8262 10.7717 20.9994 11.2499 21C11.4622 21.0001 11.6732 20.9646 11.8749 20.895C12.2924 20.7587 12.6582 20.4874 12.9201 20.1198C13.182 19.7523 13.3266 19.3073 13.3332 18.8484V12.4548C13.3335 12.3528 13.3679 12.254 13.4303 12.1758C13.4927 12.0975 13.5792 12.0446 13.6748 12.0262L17.8414 11.2128C17.9014 11.2013 17.963 11.2037 18.022 11.2199C18.0809 11.2361 18.1358 11.2657 18.1827 11.3066C18.2295 11.3474 18.2673 11.3986 18.2933 11.4565C18.3193 11.5143 18.3329 11.5774 18.3331 11.6414V14.6589C18.3327 14.7214 18.3087 14.7811 18.2664 14.8251C18.2446 14.8443 18.2194 14.8589 18.1923 14.8679C18.1651 14.8769 18.1365 14.8802 18.1081 14.8776H17.9164C17.6298 14.8803 17.3466 14.9427 17.0831 15.0612C16.6451 15.2626 16.2864 15.6159 16.0673 16.062C15.8481 16.5081 15.7818 17.0197 15.8796 17.511C15.9773 18.0023 16.233 18.4433 16.6039 18.7601C16.9748 19.0769 17.4383 19.2501 17.9164 19.2507C18.1288 19.2508 18.3397 19.2154 18.5414 19.1458C18.959 19.0094 19.3248 18.7381 19.5867 18.3706C19.8486 18.003 19.9931 17.558 19.9998 17.0991Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const DialerIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="23" viewBox="0 0 17 23" fill="none" className={className}>
      <path
        d="M8.5 23C8.00653 23 7.59102 22.834 7.25347 22.502C6.91514 22.1693 6.74597 21.7603 6.74597 21.275C6.74597 20.7905 6.91514 20.3818 7.25347 20.0491C7.59102 19.7164 8.00653 19.55 8.5 19.55C8.99346 19.55 9.40897 19.7164 9.74652 20.0491C10.0841 20.3818 10.2532 20.7905 10.254 21.275C10.2548 21.7595 10.0856 22.1685 9.74652 22.502C9.40897 22.834 8.99346 23 8.5 23ZM1.75286 3.45C1.26017 3.45 0.844662 3.28402 0.506331 2.95205C0.168779 2.61932 2.68816e-06 2.2103 2.68816e-06 1.725C2.68816e-06 1.24047 0.168779 0.831836 0.506331 0.499103C0.844662 0.166369 1.26056 2.63761e-06 1.75403 2.63761e-06C2.24749 2.63761e-06 2.663 0.166369 3.00055 0.499103C3.3381 0.831836 3.50727 1.24047 3.50805 1.725C3.50883 2.20954 3.33966 2.61855 3.00055 2.95205C2.66144 3.28555 2.24476 3.45154 1.75286 3.45ZM1.75403 10.0855C1.26056 10.0855 0.844662 9.91913 0.506331 9.5864C0.167999 9.25367 -0.000776878 8.84503 2.68816e-06 8.3605C0.000782254 7.87597 0.169558 7.46695 0.506331 7.13345C0.843103 6.79995 1.259 6.63397 1.75403 6.6355C2.24905 6.63703 2.66456 6.80302 3.00055 7.13345C3.33654 7.46388 3.50571 7.8729 3.50805 8.3605C3.50805 8.84503 3.33888 9.25367 3.00055 9.5864C2.663 9.91913 2.24749 10.0855 1.75403 10.0855ZM1.75403 16.7198C1.26056 16.7198 0.844662 16.5535 0.506331 16.2207C0.167999 15.888 -0.000776878 15.4794 2.68816e-06 14.9948C0.000782254 14.5103 0.169558 14.1013 0.506331 13.7678C0.843103 13.4343 1.259 13.2683 1.75403 13.2698C2.24905 13.2714 2.66456 13.4374 3.00055 13.7678C3.33654 14.0982 3.50571 14.5072 3.50805 14.9948C3.51039 15.4824 3.34122 15.8911 3.00055 16.2207C2.65988 16.5504 2.24437 16.7168 1.75403 16.7198ZM15.246 3.45C14.7533 3.45 14.3378 3.28402 13.9994 2.95205C13.6611 2.61932 13.4919 2.2103 13.4919 1.725C13.4919 1.24047 13.6611 0.831836 13.9994 0.499103C14.3378 0.166369 14.7533 2.63761e-06 15.246 2.63761e-06C15.7387 2.63761e-06 16.1546 0.166369 16.4937 0.499103C16.8312 0.831836 17 1.24047 17 1.725C17 2.20954 16.8312 2.61855 16.4937 2.95205C16.1561 3.28555 15.7402 3.45154 15.246 3.45ZM8.5 16.7198C8.00653 16.7198 7.59102 16.5535 7.25347 16.2207C6.91592 15.888 6.74675 15.4794 6.74597 14.9948C6.74519 14.5103 6.91436 14.1013 7.25347 13.7678C7.59102 13.4358 8.00653 13.2698 8.5 13.2698C8.99346 13.2698 9.40897 13.4358 9.74652 13.7678C10.0841 14.0998 10.2532 14.5088 10.254 14.9948C10.2548 15.4809 10.0856 15.8895 9.74652 16.2207C9.40897 16.5535 8.99346 16.7198 8.5 16.7198ZM15.2471 16.7198C14.7529 16.7198 14.337 16.5535 13.9994 16.2207C13.6611 15.888 13.4919 15.479 13.4919 14.9937C13.4919 14.5092 13.6611 14.1005 13.9994 13.7678C14.3378 13.4351 14.7533 13.2687 15.246 13.2687C15.7387 13.2687 16.1546 13.4351 16.4937 13.7678C16.8328 14.1005 17.0015 14.5092 17 14.9937C16.9984 15.4782 16.8297 15.8872 16.4937 16.2207C16.1577 16.5542 15.7418 16.7202 15.246 16.7187M15.246 10.0843C14.7533 10.0843 14.3378 9.91837 13.9994 9.5864C13.6611 9.25367 13.4919 8.84465 13.4919 8.35935C13.4919 7.87482 13.6611 7.46618 13.9994 7.13345C14.3378 6.80148 14.7533 6.6355 15.246 6.6355C15.7387 6.6355 16.1546 6.80148 16.4937 7.13345C16.8312 7.46618 17 7.8752 17 8.3605C17 8.84503 16.8312 9.25367 16.4937 9.5864C16.1553 9.91837 15.7394 10.0843 15.246 10.0843ZM8.5 10.0843C8.00653 10.0843 7.59102 9.91837 7.25347 9.5864C6.91514 9.25367 6.74597 8.84503 6.74597 8.3605C6.74597 7.87597 6.91514 7.46695 7.25347 7.13345C7.59102 6.80148 8.00653 6.6355 8.5 6.6355C8.99346 6.6355 9.40897 6.80148 9.74652 7.13345C10.0841 7.46542 10.2532 7.87443 10.254 8.3605C10.2548 8.84657 10.0856 9.2552 9.74652 9.5864C9.40897 9.91913 8.99346 10.0855 8.5 10.0855M8.5 3.45C8.00653 3.45 7.59102 3.28402 7.25347 2.95205C6.91514 2.61932 6.74597 2.2103 6.74597 1.725C6.74597 1.2397 6.91514 0.831069 7.25347 0.499103C7.5918 0.167136 8.00731 0.000769304 8.5 2.63761e-06C8.99268 -0.000764029 9.40819 0.165603 9.74652 0.499103C10.0849 0.831836 10.254 1.24047 10.254 1.725C10.254 2.20954 10.0849 2.61817 9.74652 2.9509C9.40819 3.28364 8.99268 3.44924 8.5 3.45Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const LeadsIcon = ({ className }: IconProps) => {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" className={className}>
      <path
        d="M7.4375 16.402L2.975 18.3103C2.26667 18.6106 1.59375 18.5534 0.95625 18.1385C0.31875 17.7237 0 17.136 0 16.3755V2.62027C0 2.0372 0.20825 1.53823 0.62475 1.12336C1.04125 0.708497 1.54133 0.50071 2.125 0.500004H7.4375C7.73854 0.500004 7.99106 0.601777 8.19506 0.805323C8.39906 1.00887 8.50071 1.26047 8.5 1.56014C8.49929 1.8598 8.39729 2.11176 8.194 2.31601C7.99071 2.52027 7.73854 2.62169 7.4375 2.62027H2.125V16.349L7.4375 14.0697L12.75 16.349V10.0412C12.75 9.74085 12.852 9.48924 13.056 9.2864C13.26 9.08356 13.5122 8.98179 13.8125 8.98108C14.1128 8.98038 14.3654 9.08215 14.5701 9.2864C14.7748 9.49065 14.8764 9.74226 14.875 10.0412V16.3755C14.875 17.1353 14.5562 17.723 13.9187 18.1385C13.2812 18.5541 12.6083 18.6113 11.9 18.3103L7.4375 16.402ZM7.4375 2.62027H2.125H8.5H7.4375ZM12.75 4.74054H11.6875C11.3865 4.74054 11.1343 4.63877 10.931 4.43522C10.7277 4.23168 10.6257 3.98007 10.625 3.68041C10.6243 3.38074 10.7263 3.12914 10.931 2.92559C11.1357 2.72205 11.3879 2.62027 11.6875 2.62027H12.75V1.56014C12.75 1.25977 12.852 1.00816 13.056 0.805323C13.26 0.602483 13.5122 0.50071 13.8125 0.500004C14.1128 0.499297 14.3654 0.60107 14.5701 0.805323C14.7748 1.00958 14.8764 1.26118 14.875 1.56014V2.62027H15.9375C16.2385 2.62027 16.4911 2.72205 16.6951 2.92559C16.8991 3.12914 17.0007 3.38074 17 3.68041C16.9993 3.98007 16.8973 4.23203 16.694 4.43628C16.4907 4.64054 16.2385 4.74196 15.9375 4.74054H14.875V5.80068C14.875 6.10105 14.773 6.35301 14.569 6.55655C14.365 6.7601 14.1128 6.86152 13.8125 6.86081C13.5122 6.86011 13.26 6.75833 13.056 6.55549C12.852 6.35265 12.75 6.10105 12.75 5.80068V4.74054Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AdminIcon = ({ className }: IconProps) => {
  return (
    <svg width="20" height="23" viewBox="0 0 20 23" fill="none" className={className}>
      <path
        d="M1.5 19.9615V17.9103C1.5 16.8222 1.94684 15.7787 2.74223 15.0093C3.53762 14.2399 4.6164 13.8077 5.74125 13.8077H8.39203M15.2851 19.9615C14.7227 19.9615 14.1833 19.7454 13.7856 19.3607C13.3879 18.976 13.1645 18.4543 13.1645 17.9103C13.1645 17.3662 13.3879 16.8445 13.7856 16.4598C14.1833 16.0751 14.7227 15.859 15.2851 15.859M15.2851 19.9615C15.8476 19.9615 16.3869 19.7454 16.7846 19.3607C17.1823 18.976 17.4058 18.4543 17.4058 17.9103C17.4058 17.3662 17.1823 16.8445 16.7846 16.4598C16.3869 16.0751 15.8476 15.859 15.2851 15.859M15.2851 19.9615V21.5M15.2851 15.859V14.3205M18.4989 16.1154L17.1216 16.8846M13.4497 18.9359L12.0713 19.7051M12.0713 16.1154L13.4497 16.8846M17.1216 18.9359L18.5 19.7051M3.62063 5.60256C3.62063 6.69063 4.06747 7.73414 4.86286 8.50352C5.65825 9.2729 6.73703 9.70513 7.86188 9.70513C8.98673 9.70513 10.0655 9.2729 10.8609 8.50352C11.6563 7.73414 12.1031 6.69063 12.1031 5.60256C12.1031 4.5145 11.6563 3.47099 10.8609 2.70161C10.0655 1.93223 8.98673 1.5 7.86188 1.5C6.73703 1.5 5.65825 1.93223 4.86286 2.70161C4.06747 3.47099 3.62063 4.5145 3.62063 5.60256Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const SettingsIcon = ({ className }: IconProps) => {
  return (
    <svg width="18" height="17" viewBox="0 0 18 17" fill="none" className={className}>
      <path
        d="M6.67413 16.5L6.33582 13.94C6.15257 13.8733 5.98003 13.7933 5.81821 13.7C5.65638 13.6067 5.49766 13.5067 5.34204 13.4L2.82587 14.4L0.5 10.6L2.67786 9.04C2.66376 8.94667 2.65672 8.8568 2.65672 8.7704V8.2304C2.65672 8.14347 2.66376 8.05333 2.67786 7.96L0.5 6.4L2.82587 2.6L5.34204 3.6C5.4971 3.49333 5.6592 3.39333 5.82836 3.3C5.99751 3.20667 6.16667 3.12667 6.33582 3.06L6.67413 0.5H11.3259L11.6642 3.06C11.8474 3.12667 12.0202 3.20667 12.1826 3.3C12.345 3.39333 12.5035 3.49333 12.658 3.6L15.1741 2.6L17.5 6.4L15.3221 7.96C15.3362 8.05333 15.3433 8.14347 15.3433 8.2304V8.7696C15.3433 8.85653 15.3292 8.94667 15.301 9.04L17.4789 10.6L15.153 14.4L12.658 13.4C12.5029 13.5067 12.3408 13.6067 12.1716 13.7C12.0025 13.7933 11.8333 13.8733 11.6642 13.94L11.3259 16.5H6.67413ZM8.15423 14.9H9.82463L10.1206 12.78C10.5576 12.6733 10.963 12.5168 11.3369 12.3104C11.7107 12.104 12.0524 11.8539 12.3619 11.56L14.4552 12.38L15.2799 11.02L13.4614 9.72C13.5319 9.53333 13.5813 9.3368 13.6095 9.1304C13.6376 8.924 13.6517 8.71387 13.6517 8.5C13.6517 8.28613 13.6376 8.07627 13.6095 7.8704C13.5813 7.66453 13.5319 7.46773 13.4614 7.28L15.2799 5.98L14.4552 4.62L12.3619 5.46C12.0518 5.15333 11.7101 4.8968 11.3369 4.6904C10.9636 4.484 10.5582 4.3272 10.1206 4.22L9.84577 2.1H8.17537L7.87935 4.22C7.44237 4.32667 7.03725 4.48347 6.66398 4.6904C6.29071 4.89733 5.94874 5.1472 5.63806 5.44L3.54478 4.62L2.72015 5.98L4.53856 7.26C4.46808 7.46 4.41874 7.66 4.39055 7.86C4.36236 8.06 4.34826 8.27333 4.34826 8.5C4.34826 8.71333 4.36236 8.92 4.39055 9.12C4.41874 9.32 4.46808 9.52 4.53856 9.72L2.72015 11.02L3.54478 12.38L5.63806 11.54C5.94818 11.8467 6.29015 12.1035 6.66398 12.3104C7.03781 12.5173 7.44294 12.6739 7.87935 12.78L8.15423 14.9ZM9.04229 11.3C9.85987 11.3 10.5576 11.0267 11.1356 10.48C11.7135 9.93333 12.0025 9.27333 12.0025 8.5C12.0025 7.72667 11.7135 7.06667 11.1356 6.52C10.5576 5.97333 9.85987 5.7 9.04229 5.7C8.21061 5.7 7.50919 5.97333 6.93801 6.52C6.36683 7.06667 6.08153 7.72667 6.08209 8.5C6.08265 9.27333 6.36824 9.93333 6.93886 10.48C7.50947 11.0267 8.21061 11.3 9.04229 11.3Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const IntegrationIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      fill="currentColor"
      viewBox="2.09 2.08 19.84 19.85"
      className={className}
    >
      <path d="M18.01 14.06c.26 0 .51-.1.71-.29l2.48-2.47c.47-.47.73-1.1.73-1.77s-.26-1.3-.73-1.77l-1.77-1.77 2.12-2.12-1.41-1.41-2.12 2.12-1.77-1.77c-.98-.97-2.56-.97-3.54 0l-2.47 2.47a.996.996 0 0 0 0 1.41l7.07 7.07c.2.2.45.29.71.29Zm-3.89-9.84c.13-.13.28-.15.35-.15s.23.02.35.15l4.95 4.95c.13.13.15.28.15.35s-.02.23-.15.35L18 11.64l-5.66-5.66 1.77-1.77ZM13.06 12.35l-2.12 2.12-1.41-1.41 2.12-2.12-1.41-1.41-2.12 2.12-1.41-1.41a.996.996 0 0 0-1.41 0l-2.48 2.47c-.47.47-.73 1.1-.73 1.77s.26 1.3.73 1.77l1.77 1.77-2.12 2.12 1.41 1.41L6 19.43l1.77 1.77c.49.49 1.13.73 1.77.73s1.28-.24 1.77-.73l2.47-2.47a.996.996 0 0 0 0-1.41l-1.41-1.41 2.12-2.12-1.41-1.41Zm-3.18 7.42c-.13.13-.28.15-.35.15s-.23-.02-.35-.15l-4.95-4.95c-.13-.13-.15-.28-.15-.35s.02-.23.15-.35L6 12.35l3.54 3.54 1.41 1.41.71.71-1.77 1.77Z"></path>{' '}
    </svg>
  );
};
export const EditStrokIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="18"
      height="17"
      viewBox="0 0 18 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M5.28248 11.4033L12.0383 4.64332L11.0922 3.69665L4.33641 10.47V11.4033H5.28248ZM5.82881 12.7367H3.00391V9.90999L10.6258 2.28332C10.7502 2.15888 10.9056 2.09665 11.0922 2.09665C11.2787 2.09665 11.4342 2.15888 11.5586 2.28332L13.4507 4.17665C13.584 4.3011 13.6506 4.45665 13.6506 4.64332C13.6506 4.82999 13.584 4.98999 13.4507 5.12332L5.82881 12.7367ZM3.00391 14.07H14.9964V15.4033H3.00391V14.07Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PhoneMissedIcon = ({ className }: IconProps) => {
  return (
    <svg
      data-v-39ea7f52=""
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path d="m16 2 6 6"></path>
      <path d="m22 2-6 6"></path>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path>
    </svg>
  );
};
export const MessageStrokIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.73075 12.4089L1.75928 14.7422V2.40885C1.75928 2.23108 1.82368 2.07552 1.95249 1.94219C2.0813 1.80885 2.23898 1.74219 2.42553 1.74219H14.418C14.6046 1.74219 14.7623 1.80885 14.8911 1.94219C15.0199 2.07552 15.0843 2.23108 15.0843 2.40885V11.7422C15.0843 11.9289 15.0199 12.0889 14.8911 12.2222C14.7623 12.3555 14.6046 12.4177 14.418 12.4089H4.73075ZM4.26438 11.0755H13.7518V3.07552H3.09178V12.0089L4.26438 11.0755ZM7.75553 6.40885H9.08803V7.74219H7.75553V6.40885ZM5.09053 6.40885H6.42303V7.74219H5.09053V6.40885ZM10.4205 6.40885H11.753V7.74219H10.4205V6.40885Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CompayIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 21 21"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.9355 0C14.466 0 14.9747 0.210714 15.3498 0.585786C15.7248 0.960859 15.9355 1.46957 15.9355 2V6H17.9355C18.466 6 18.9747 6.21071 19.3498 6.58579C19.7248 6.96086 19.9355 7.46957 19.9355 8V16C20.2008 16 20.4551 16.1054 20.6427 16.2929C20.8302 16.4804 20.9355 16.7348 20.9355 17C20.9355 17.2652 20.8302 17.5196 20.6427 17.7071C20.4551 17.8946 20.2008 18 19.9355 18H1.93555C1.67033 18 1.41598 17.8946 1.22844 17.7071C1.0409 17.5196 0.935547 17.2652 0.935547 17C0.935547 16.7348 1.0409 16.4804 1.22844 16.2929C1.41598 16.1054 1.67033 16 1.93555 16V6C1.93555 5.46957 2.14626 4.96086 2.52133 4.58579C2.89641 4.21071 3.40511 4 3.93555 4H5.93555V2C5.93555 1.46957 6.14626 0.960859 6.52133 0.585786C6.89641 0.210714 7.40511 0 7.93555 0H13.9355ZM5.93555 6H3.93555V16H5.93555V6ZM17.9355 8H15.9355V16H17.9355V8ZM13.9355 2H7.93555V16H13.9355V2ZM11.9355 12V14H9.93555V12H11.9355ZM11.9355 8V10H9.93555V8H11.9355ZM11.9355 4V6H9.93555V4H11.9355Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UserIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.9999 15C8.82977 15 6.01065 16.5306 4.21585 18.906C3.82956 19.4172 3.63641 19.6728 3.64273 20.0183C3.64761 20.2852 3.81521 20.6219 4.02522 20.7867C4.29704 21 4.67372 21 5.42708 21H18.5726C19.326 21 19.7027 21 19.9745 20.7867C20.1845 20.6219 20.3521 20.2852 20.357 20.0183C20.3633 19.6728 20.1701 19.4172 19.7839 18.906C17.9891 16.5306 15.1699 15 11.9999 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.9999 12C14.4851 12 16.4999 9.98528 16.4999 7.5C16.4999 5.01472 14.4851 3 11.9999 3C9.51457 3 7.49985 5.01472 7.49985 7.5C7.49985 9.98528 9.51457 12 11.9999 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const UserCircleIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M9.18555 9C9.18555 8.00544 9.58064 7.05161 10.2839 6.34835C10.9872 5.64509 11.941 5.25 12.9355 5.25C13.9301 5.25 14.8839 5.64509 15.5872 6.34835C16.2905 7.05161 16.6855 8.00544 16.6855 9C16.6855 9.99456 16.2905 10.9484 15.5872 11.6517C14.8839 12.3549 13.9301 12.75 12.9355 12.75C11.941 12.75 10.9872 12.3549 10.2839 11.6517C9.58064 10.9484 9.18555 9.99456 9.18555 9ZM12.9355 6.75C12.3388 6.75 11.7665 6.98705 11.3446 7.40901C10.9226 7.83097 10.6855 8.40326 10.6855 9C10.6855 9.59674 10.9226 10.169 11.3446 10.591C11.7665 11.0129 12.3388 11.25 12.9355 11.25C13.5323 11.25 14.1046 11.0129 14.5265 10.591C14.9485 10.169 15.1855 9.59674 15.1855 9C15.1855 8.40326 14.9485 7.83097 14.5265 7.40901C14.1046 6.98705 13.5323 6.75 12.9355 6.75Z"
        fill="currentColor"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M2.18555 12C2.18555 6.063 6.99855 1.25 12.9355 1.25C18.8725 1.25 23.6855 6.063 23.6855 12C23.6855 17.937 18.8725 22.75 12.9355 22.75C6.99855 22.75 2.18555 17.937 2.18555 12ZM12.9355 2.75C11.1082 2.75008 9.32189 3.29139 7.80189 4.30561C6.28189 5.31983 5.09633 6.76153 4.39481 8.44881C3.69328 10.1361 3.50721 11.9933 3.86008 13.7863C4.21295 15.5792 5.08895 17.2274 6.37755 18.523C6.55755 17.55 6.91255 16.633 7.62355 15.895C8.68855 14.791 10.3895 14.25 12.9355 14.25C15.4815 14.25 17.1825 14.791 18.2465 15.895C18.9585 16.633 19.3125 17.551 19.4935 18.524C20.7825 17.2285 21.6588 15.5801 22.0118 13.7871C22.3649 11.994 22.1789 10.1365 21.4774 8.449C20.7758 6.76151 19.5901 5.31966 18.0699 4.30539C16.5497 3.29112 14.7631 2.74989 12.9355 2.75ZM18.1295 19.655C18.0275 18.443 17.7645 17.555 17.1675 16.936C16.5175 16.263 15.3145 15.75 12.9355 15.75C10.5565 15.75 9.35355 16.263 8.70355 16.936C8.10655 17.556 7.84355 18.443 7.74155 19.656C9.27293 20.6981 11.0832 21.2537 12.9355 21.25C14.788 21.2534 16.5983 20.6975 18.1295 19.655Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const ShareIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M18 22C19.6569 22 21 20.6569 21 19C21 17.3431 19.6569 16 18 16C16.3431 16 15 17.3431 15 19C15 20.6569 16.3431 22 18 22Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 15C7.65685 15 9 13.6569 9 12C9 10.3431 7.65685 9 6 9C4.34315 9 3 10.3431 3 12C3 13.6569 4.34315 15 6 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.58984 13.5098L15.4198 17.4898"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5C15 6.65685 16.3431 8 18 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.4098 6.50977L8.58984 10.4898"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const CRMIcon = ({ className }: IconProps) => {
  return (
    <svg className={className} fill="currentColor" viewBox="3 2 18 20">
      <path d="M5 16v.18c-1.16.41-2 1.51-2 2.82 0 1.65 1.35 3 3 3s3-1.35 3-3c0-1.3-.84-2.4-2-2.82V13h9.5a2.5 2.5 0 0 0 2.5-2.5V7.82c1.16-.41 2-1.51 2-2.82 0-1.65-1.35-3-3-3s-3 1.35-3 3c0 1.3.84 2.4 2 2.82v2.68c0 .28-.22.5-.5.5H7V7.82C8.16 7.41 9 6.31 9 5c0-1.65-1.35-3-3-3S3 3.35 3 5c0 1.3.84 2.4 2 2.82zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1M6 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m0 16c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1"></path>
    </svg>
  );
};
export const ReportIcon = ({ className }: IconProps) => {
  return (
    <svg className={className} fill="currentColor" viewBox="4 2.01 16 20">
      <path d="m19.94,7.68s-.02-.06-.03-.09c-.05-.11-.11-.21-.2-.29l-5-5c-.09-.09-.19-.15-.3-.2-.03-.01-.06-.02-.09-.03-.09-.03-.18-.05-.27-.05-.02,0-.04-.01-.05-.01H6c-1.1,0-2,.9-2,2v16c0,1.1.9,2,2,2h12c1.1,0,2-.9,2-2v-12s-.01-.04-.01-.06c0-.09-.02-.17-.05-.26Zm-13.94,12.32V4h7v4c0,.55.45,1,1,1h4v11H6Z"></path>
      <path d="M8 12H10V18H8z"></path>
      <path d="M11 10H13V18H11z"></path>
      <path d="M14 14H16V18H14z"></path>
    </svg>
  );
};
export const UcomingMeetingIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="17"
      height="18"
      viewBox="0 0 17 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.54167 16.0827C3.15208 16.0827 2.81869 15.9441 2.5415 15.6669C2.26431 15.3897 2.12547 15.0561 2.125 14.666V4.74935C2.125 4.35977 2.26383 4.02638 2.5415 3.74918C2.81917 3.47199 3.15256 3.33315 3.54167 3.33268H4.25V1.91602H5.66667V3.33268H11.3333V1.91602H12.75V3.33268H13.4583C13.8479 3.33268 14.1815 3.47152 14.4592 3.74918C14.7369 4.02685 14.8755 4.36024 14.875 4.74935V8.29102H13.4583V7.58268H3.54167V14.666H8.5V16.0827H3.54167ZM3.54167 6.16602H13.4583V4.74935H3.54167V6.16602ZM9.91667 16.0827V13.9046L13.8302 10.0087C13.9365 9.90247 14.0545 9.82574 14.1844 9.77852C14.3142 9.73129 14.4441 9.70768 14.574 9.70768C14.7156 9.70768 14.8514 9.73436 14.9813 9.78772C15.1111 9.84109 15.2292 9.92066 15.3354 10.0264L15.9906 10.6816C16.0851 10.7879 16.159 10.9059 16.2123 11.0358C16.2657 11.1657 16.2921 11.2955 16.2917 11.4254C16.2912 11.5553 16.2676 11.6882 16.2208 11.8242C16.1741 11.9602 16.0973 12.0811 15.9906 12.1868L12.0948 16.0827H9.91667ZM10.9792 15.0202H11.6521L13.7948 12.8598L13.476 12.5233L13.1396 12.2046L10.9792 14.3473V15.0202ZM13.476 12.5233L13.1396 12.2046L13.7948 12.8598L13.476 12.5233Z"
        fill="currentColor"
      />
    </svg>
  );
};

export const MobileOutlined = ({ className }: IconProps) => {
  return (
    <svg width="24" height="24" fill="currentColor" viewBox="5 2 14 20" className={className}>
      {' '}
      <path d="M7 22h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2M7 4h10v16H7z"></path>
      <path d="M12 17a1 1 0 1 0 0 2 1 1 0 1 0 0-2"></path>{' '}
    </svg>
  );
};

export const LandlineOutlined = ({ className }: IconProps) => {
  return (
    <svg
      width="800"
      height="800"
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M71.9248 91.0873H75.1469V74.9864C75.1469 48.7563 96.6243 27.2979 122.835 27.2979H281.879C308.119 27.2979 329.568 48.7752 329.568 74.9864V91.0873H728.075C762.639 91.0873 790.929 119.396 790.929 153.941V646.059C790.929 680.623 762.62 708.903 728.075 708.903H329.568V725.014C329.568 751.244 308.09 772.702 281.879 772.702H122.835C96.5959 772.702 75.1469 751.225 75.1469 725.014V708.903H71.9248C37.3608 708.903 9.0708 680.604 9.0708 646.059V153.941C9.0708 119.33 37.3135 91.0873 71.9248 91.0873ZM114.275 362.214H290.44V298.821H114.275V362.214ZM290.44 401.342H114.275V725.014C114.275 729.719 118.111 733.574 122.835 733.574H281.879C286.604 733.574 290.44 729.729 290.44 725.014V401.342ZM114.275 259.693H290.44V110.656V74.9864C290.44 70.2809 286.604 66.4257 281.879 66.4257H122.835C118.111 66.4257 114.275 70.2714 114.275 74.9864V110.656V259.693ZM387.471 586.446C361.732 586.446 361.732 547.318 387.471 547.318H441.008C466.747 547.318 466.747 586.446 441.008 586.446H387.471ZM629.542 586.446C603.803 586.446 603.803 547.318 629.542 547.318H683.079C708.818 547.318 708.818 586.446 683.079 586.446H629.542ZM508.502 586.446C482.772 586.446 482.772 547.318 508.502 547.318H562.039C587.778 547.318 587.778 586.446 562.039 586.446H508.502ZM387.471 420.136C361.732 420.136 361.732 380.998 387.471 380.998H441.008C466.747 380.998 466.747 420.136 441.008 420.136H387.471ZM629.542 420.136C603.803 420.136 603.803 380.998 629.542 380.998H683.079C708.818 380.998 708.818 420.136 683.079 420.136H629.542ZM508.502 420.136C482.772 420.136 482.772 380.998 508.502 380.998H562.039C587.778 380.998 587.778 420.136 562.039 420.136H508.502ZM387.471 503.286C361.732 503.286 361.732 464.158 387.471 464.158H441.008C466.747 464.158 466.747 503.286 441.008 503.286H387.471ZM629.542 503.286C603.803 503.286 603.803 464.158 629.542 464.158H683.079C708.818 464.158 708.818 503.286 683.079 503.286H629.542ZM508.502 503.286C482.772 503.286 482.772 464.158 508.502 464.158H562.039C587.778 464.158 587.778 503.286 562.039 503.286H508.502ZM386.327 213.545H687.067C697.867 213.545 706.626 222.314 706.626 233.114V317.407C706.626 328.217 697.867 336.976 687.067 336.976H386.327C375.527 336.976 366.768 328.217 366.768 317.407V233.114C366.768 222.314 375.527 213.545 386.327 213.545ZM667.498 252.682H405.896V297.848H667.498V252.682ZM75.1469 130.215H71.9248C58.9232 130.215 48.2081 140.94 48.2081 153.941V646.059C48.2081 659.098 58.857 669.775 71.9248 669.775H75.1469C75.1469 489.925 75.1469 310.075 75.1469 130.215ZM728.075 130.215H329.568C329.568 310.075 329.568 489.925 329.568 669.775H728.075C741.114 669.775 751.801 659.117 751.801 646.059V153.941C751.801 140.874 741.143 130.215 728.075 130.215Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const UsersIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="14"
      viewBox="0 0 16 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M1.86914 13.125C1.86914 12.2772 2.08295 11.4917 2.51058 10.7683C2.92265 10.0683 3.47857 9.51222 4.17832 9.1C4.90139 8.67222 5.68667 8.45833 6.53414 8.45833C7.38162 8.45833 8.16689 8.67222 8.88997 9.1C9.58972 9.51222 10.1456 10.0683 10.5577 10.7683C10.9853 11.4917 11.1991 12.2772 11.1991 13.125H10.0329C10.0329 12.495 9.8735 11.9078 9.55473 11.3633C9.24373 10.8344 8.82388 10.4144 8.29518 10.1033C7.75093 9.78444 7.16392 9.625 6.53414 9.625C5.90437 9.625 5.31735 9.78444 4.7731 10.1033C4.2444 10.4144 3.82455 10.8344 3.51355 11.3633C3.19478 11.9078 3.03539 12.495 3.03539 13.125H1.86914ZM6.53414 7.875C5.89659 7.875 5.30958 7.71556 4.7731 7.39667C4.2444 7.08556 3.82455 6.66556 3.51355 6.13667C3.19478 5.6 3.03539 5.01278 3.03539 4.375C3.03539 3.73722 3.19478 3.15 3.51355 2.61333C3.82455 2.08444 4.2444 1.66444 4.7731 1.35333C5.30958 1.03444 5.89659 0.875 6.53414 0.875C7.17169 0.875 7.7587 1.03444 8.29518 1.35333C8.82388 1.66444 9.24373 2.08444 9.55473 2.61333C9.8735 3.15 10.0329 3.73722 10.0329 4.375C10.0329 5.01278 9.8735 5.6 9.55473 6.13667C9.24373 6.66556 8.82388 7.08556 8.29518 7.39667C7.7587 7.71556 7.17169 7.875 6.53414 7.875ZM6.53414 6.70833C6.95399 6.70833 7.34274 6.60333 7.70039 6.39333C8.05804 6.18333 8.34183 5.89944 8.55175 5.54167C8.76168 5.18389 8.86664 4.795 8.86664 4.375C8.86664 3.955 8.76168 3.56611 8.55175 3.20833C8.34183 2.85056 8.05804 2.56667 7.70039 2.35667C7.34274 2.14667 6.95399 2.04167 6.53414 2.04167C6.11429 2.04167 5.72554 2.14667 5.36789 2.35667C5.01024 2.56667 4.72645 2.85056 4.51653 3.20833C4.3066 3.56611 4.20164 3.955 4.20164 4.375C4.20164 4.795 4.3066 5.18389 4.51653 5.54167C4.72645 5.89944 5.01024 6.18333 5.36789 6.39333C5.72554 6.60333 6.11429 6.70833 6.53414 6.70833ZM11.3624 8.86667C11.9067 9.10778 12.3868 9.44417 12.8027 9.87583C13.2187 10.3075 13.5394 10.7956 13.7649 11.34C13.9981 11.9078 14.1148 12.5028 14.1148 13.125H12.9485C12.9485 12.425 12.758 11.7833 12.3771 11.2C12.0039 10.6322 11.5063 10.2083 10.8843 9.92833L11.3624 8.86667ZM10.9659 2.28667C11.5568 2.52778 12.035 2.91667 12.4004 3.45333C12.7658 3.99 12.9485 4.58889 12.9485 5.25C12.9485 5.80222 12.8202 6.31361 12.5637 6.78417C12.3071 7.25472 11.9553 7.63778 11.5082 7.93333C11.0611 8.22889 10.5694 8.4 10.0329 8.44667V7.26833C10.3594 7.22167 10.6568 7.10306 10.9251 6.9125C11.1933 6.72194 11.4032 6.48083 11.5548 6.18917C11.7065 5.8975 11.7823 5.58444 11.7823 5.25C11.7823 4.85333 11.6773 4.49167 11.4674 4.165C11.2575 3.83833 10.9814 3.58944 10.6393 3.41833L10.9659 2.28667Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PlusIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export const HeartIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M8.99984 2.85349C9.51508 2.39127 10.1058 2.08682 10.7721 1.94016C11.4383 1.79349 12.0957 1.80904 12.7442 1.98682C13.4193 2.17349 14.0034 2.51349 14.4964 3.00682C14.9894 3.50016 15.3292 4.0846 15.5158 4.76016C15.6934 5.40905 15.709 6.0646 15.5624 6.72682C15.4158 7.38904 15.1116 7.98238 14.6496 8.50682L8.99984 14.1602L3.35004 8.50682C2.88811 7.98238 2.58386 7.38904 2.43728 6.72682C2.29071 6.0646 2.30625 5.40905 2.48392 4.76016C2.67047 4.0846 3.01248 3.50016 3.50994 3.00682C4.00741 2.51349 4.58927 2.17349 5.25552 1.98682C5.904 1.80904 6.56137 1.79349 7.22762 1.94016C7.89387 2.08682 8.48461 2.39127 8.99984 2.85349ZM13.5437 3.94682C13.215 3.61793 12.833 3.39349 12.3977 3.27349C11.9624 3.15349 11.5227 3.14238 11.0785 3.24016C10.6344 3.33793 10.2391 3.54238 9.89262 3.85349L8.99984 4.65349L8.10707 3.85349C7.7695 3.54238 7.37641 3.33793 6.9278 3.24016C6.4792 3.14238 6.03725 3.15349 5.60197 3.27349C5.16668 3.39349 4.7847 3.61793 4.45602 3.94682C4.12733 4.27571 3.90081 4.65793 3.77644 5.09349C3.65208 5.52905 3.63653 5.96682 3.72981 6.40682C3.82308 6.84682 4.02073 7.24016 4.32277 7.58682L8.99984 12.2802L13.6769 7.58682C13.979 7.24016 14.1766 6.84682 14.2699 6.40682C14.3632 5.96682 14.3476 5.52905 14.2232 5.09349C14.0989 4.65793 13.8724 4.27571 13.5437 3.94682Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const PastMeetingIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.54167 13.4583V3.54167V11.5813V10.076V13.4583ZM3.54167 14.875C3.15208 14.875 2.81869 14.7364 2.5415 14.4592C2.26431 14.182 2.12547 13.8484 2.125 13.4583V3.54167C2.125 3.15208 2.26383 2.81869 2.5415 2.5415C2.81917 2.26431 3.15256 2.12547 3.54167 2.125H13.4583C13.8479 2.125 14.1815 2.26383 14.4592 2.5415C14.7369 2.81917 14.8755 3.15256 14.875 3.54167V9.20833H13.4583V3.54167H3.54167V13.4583H8.5V14.875H3.54167ZM12.2896 15.5833L9.775 13.0688L10.7844 12.0771L12.2896 13.5823L15.3 10.5719L16.2917 11.5813L12.2896 15.5833ZM5.66667 9.20833C5.86736 9.20833 6.03571 9.14033 6.17171 9.00433C6.30771 8.86833 6.37547 8.70022 6.375 8.5C6.37453 8.29978 6.30653 8.13167 6.171 7.99567C6.03547 7.85967 5.86736 7.79167 5.66667 7.79167C5.46597 7.79167 5.29786 7.85967 5.16233 7.99567C5.02681 8.13167 4.95881 8.29978 4.95833 8.5C4.95786 8.70022 5.02586 8.86857 5.16233 9.00504C5.29881 9.14151 5.46692 9.20928 5.66667 9.20833ZM5.66667 6.375C5.86736 6.375 6.03571 6.307 6.17171 6.171C6.30771 6.035 6.37547 5.86689 6.375 5.66667C6.37453 5.46644 6.30653 5.29833 6.171 5.16233C6.03547 5.02633 5.86736 4.95833 5.66667 4.95833C5.46597 4.95833 5.29786 5.02633 5.16233 5.16233C5.02681 5.29833 4.95881 5.46644 4.95833 5.66667C4.95786 5.86689 5.02586 6.03524 5.16233 6.17171C5.29881 6.30818 5.46692 6.37594 5.66667 6.375ZM7.79167 9.20833H12.0417V7.79167H7.79167V9.20833ZM7.79167 6.375H12.0417V4.95833H7.79167V6.375Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const VideoRecordIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M18 9c0-1.103-.897-2-2-2h-1.434l-2.418-4.029A2.008 2.008 0 0 0 10.434 2H5v2h5.434l1.8 3H4c-1.103 0-2 .897-2 2v9c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-3l4 2v-7l-4 2V9zm-1.998 9H4V9h12l.001 4H16v1l.001.001.001 3.999z"></path>
      <path d="M6 14h6v2H6z"></path>
    </svg>
  );
};
export const FolderIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="18"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.66999 3.33333V12.6667H14.33V4.66667H8.72017L7.38767 3.33333H3.66999ZM9.27982 3.33333H14.9962C15.1828 3.33333 15.3405 3.39778 15.4693 3.52667C15.5981 3.65556 15.6625 3.81333 15.6625 4V13.3333C15.6625 13.52 15.5981 13.6778 15.4693 13.8067C15.3405 13.9356 15.1828 14 14.9962 14H3.00374C2.81719 14 2.65951 13.9356 2.53071 13.8067C2.4019 13.6778 2.33749 13.52 2.33749 13.3333V2.66667C2.33749 2.48 2.4019 2.32222 2.53071 2.19333C2.65951 2.06444 2.81719 2 3.00374 2H7.94732L9.27982 3.33333Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const GoogleIcon = ({ className }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3.06364 7.50914C4.70909 4.24092 8.09084 2 12 2C14.6954 2 16.959 2.99095 18.6909 4.60455L15.8227 7.47274C14.7864 6.48185 13.4681 5.97727 12 5.97727C9.39542 5.97727 7.19084 7.73637 6.40455 10.1C6.2045 10.7 6.09086 11.3409 6.09086 12C6.09086 12.6591 6.2045 13.3 6.40455 13.9C7.19084 16.2636 9.39542 18.0227 12 18.0227C13.3454 18.0227 14.4909 17.6682 15.3864 17.0682C16.4454 16.3591 17.15 15.3 17.3818 14.05H12V10.1818H21.4181C21.5364 10.8363 21.6 11.5182 21.6 12.2273C21.6 15.2727 20.5091 17.8363 18.6181 19.5773C16.9636 21.1046 14.7 22 12 22C8.09084 22 4.70909 19.7591 3.06364 16.4909C2.38638 15.1409 2 13.6136 2 12C2 10.3864 2.38638 8.85911 3.06364 7.50914Z"></path>
    </svg>
  );
};
export const OutlookIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 256 256"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M120,128a32,32,0,1,0-32,32A32,32,0,0,0,120,128Zm-48,0a16,16,0,1,1,16,16A16,16,0,0,1,72,128Zm152-24H208V40a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8V64H40A16,16,0,0,0,24,80v96a16,16,0,0,0,16,16H72v16a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V112A8,8,0,0,0,224,104Zm-58.34,60L216,127.65v72.7ZM112,48h80v77.24l-40,28.89V80a16,16,0,0,0-16-16H112ZM40,80h96v77.9c0,.12,0,.24,0,.36V176H40ZM88,192h48a16,16,0,0,0,16-16v-2.13L199.26,208H88Z"></path>
    </svg>
  );
};
export const WhiteBoard = ({ className }: IconProps) => {
  return (
    <svg fill="currentColor" viewBox="2 3 19.98 18.44" className={className}>
      {' '}
      <path d="M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3.38L6.1 20.55l1.79.89 1.72-3.45h4.76l1.72 3.45 1.79-.89L16.6 18h3.38c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm0 13H4V5h16z"></path>
      <path d="M6 12h4v2H6z"></path>{' '}
    </svg>
  );
};
export const PaperPinIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 24 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.7889 7.60391L9.76209 12.616C9.5963 12.7937 9.51341 13.0041 9.51341 13.247C9.51341 13.4899 9.59926 13.7002 9.77097 13.8779C9.94267 14.0557 10.1529 14.1445 10.4015 14.1445C10.6502 14.1445 10.8574 14.0557 11.0232 13.8779L16.05 8.84805C16.3934 8.50443 16.6243 8.10452 16.7428 7.64834C16.8612 7.19215 16.8612 6.73597 16.7428 6.27978C16.6243 5.8236 16.3934 5.4237 16.05 5.08008C15.7066 4.73646 15.3069 4.5054 14.851 4.38691C14.3951 4.26842 13.9392 4.26842 13.4833 4.38691C13.0274 4.5054 12.6278 4.73646 12.2844 5.08008L7.25758 10.11C6.68918 10.6787 6.30432 11.3452 6.10301 12.1095C5.9017 12.8737 5.9017 13.638 6.10301 14.4022C6.30432 15.1665 6.68918 15.833 7.25758 16.4018C7.82598 16.9705 8.49207 17.3526 9.25586 17.5481C10.0196 17.7437 10.7834 17.7437 11.5472 17.5481C12.311 17.3526 12.9771 16.9705 13.5455 16.4018L18.5545 11.3719L19.8157 12.616L14.7889 17.6459C13.9955 18.4398 13.06 18.9789 11.9824 19.2633C10.9285 19.5477 9.87458 19.5477 8.82068 19.2633C7.74308 18.9789 6.80463 18.4398 6.00532 17.6459C5.20601 16.852 4.66425 15.916 4.38005 14.8377C4.10769 13.7831 4.10769 12.7286 4.38005 11.674C4.66425 10.5958 5.20305 9.65378 5.99644 8.84805L11.0232 3.81816C11.5916 3.24941 12.2577 2.86728 13.0215 2.67178C13.7853 2.47627 14.5491 2.47627 15.3129 2.67178C16.0767 2.86728 16.7428 3.24941 17.3112 3.81816C17.8796 4.38691 18.2614 5.05342 18.4568 5.81768C18.6522 6.58193 18.6522 7.34619 18.4568 8.11045C18.2614 8.87471 17.8796 9.54121 17.3112 10.11L12.2844 15.1398C11.941 15.4835 11.5413 15.7145 11.0854 15.833C10.6295 15.9515 10.1736 15.9515 9.71768 15.833C9.26178 15.7145 8.86212 15.4835 8.51871 15.1398C8.1753 14.7962 7.94439 14.3963 7.82598 13.9401C7.70756 13.484 7.70756 13.0278 7.82598 12.5716C7.94439 12.1154 8.1753 11.7155 8.51871 11.3719L13.5455 6.34199L14.7889 7.60391Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const HoldMusicIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.3333 14.1667C10.7431 14.1667 10.2413 13.9601 9.82813 13.5469C9.41493 13.1337 9.20834 12.6319 9.20834 12.0417C9.20834 11.4514 9.41493 10.9497 9.82813 10.5365C10.2413 10.1233 10.7431 9.91667 11.3333 9.91667C11.4632 9.91667 11.5872 9.92564 11.7052 9.94358C11.8233 9.96153 11.9354 9.99978 12.0417 10.0583V4.95833C12.0417 4.75764 12.1097 4.58953 12.2457 4.454C12.3817 4.31847 12.5498 4.25047 12.75 4.25H14.875C15.0757 4.25 15.244 4.318 15.38 4.454C15.516 4.59 15.5838 4.75811 15.5833 4.95833C15.5829 5.15856 15.5149 5.3269 15.3793 5.46337C15.2438 5.59985 15.0757 5.66761 14.875 5.66667H13.4583V12.0417C13.4583 12.6319 13.2517 13.1337 12.8385 13.5469C12.4253 13.9601 11.9236 14.1667 11.3333 14.1667ZM2.83334 11.3333C2.63264 11.3333 2.46453 11.2653 2.329 11.1293C2.19347 10.9933 2.12547 10.8252 2.125 10.625C2.12453 10.4248 2.19253 10.2567 2.329 10.1207C2.46547 9.98467 2.63359 9.91667 2.83334 9.91667H7.08334C7.28403 9.91667 7.45238 9.98467 7.58838 10.1207C7.72438 10.2567 7.79214 10.4248 7.79167 10.625C7.7912 10.8252 7.7232 10.9936 7.58767 11.13C7.45214 11.2665 7.28403 11.3343 7.08334 11.3333H2.83334ZM2.83334 8.5C2.63264 8.5 2.46453 8.432 2.329 8.296C2.19347 8.16 2.12547 7.99189 2.125 7.79167C2.12453 7.59144 2.19253 7.42333 2.329 7.28733C2.46547 7.15133 2.63359 7.08333 2.83334 7.08333H9.91667C10.1174 7.08333 10.2857 7.15133 10.4217 7.28733C10.5577 7.42333 10.6255 7.59144 10.625 7.79167C10.6245 7.99189 10.5565 8.16024 10.421 8.29671C10.2855 8.43318 10.1174 8.50094 9.91667 8.5H2.83334ZM2.83334 5.66667C2.63264 5.66667 2.46453 5.59867 2.329 5.46267C2.19347 5.32667 2.12547 5.15856 2.125 4.95833C2.12453 4.75811 2.19253 4.59 2.329 4.454C2.46547 4.318 2.63359 4.25 2.83334 4.25H9.91667C10.1174 4.25 10.2857 4.318 10.4217 4.454C10.5577 4.59 10.6255 4.75811 10.625 4.95833C10.6245 5.15856 10.5565 5.3269 10.421 5.46337C10.2855 5.59985 10.1174 5.66761 9.91667 5.66667H2.83334Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const RingtoneIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clip-path="url(#clip0_207_121)">
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M0 2.5V4.16667C0.43 4.16667 1.06333 4.464 1.63333 5.03333C2.20267 5.60333 2.5 6.23667 2.5 6.66667H4.16667C4.16667 6.23667 4.464 5.60333 5.03333 5.03333C5.60333 4.464 6.23667 4.16667 6.66667 4.16667V2.5C6.23667 2.5 5.60333 2.20267 5.03333 1.63333C4.46467 1.06267 4.16667 0.429333 4.16667 0H2.5C2.5 0.43 2.20267 1.06333 1.63333 1.63333C1.06333 2.20267 0.43 2.5 0 2.5ZM9 2.66667H10.5C11.9587 2.66667 13.3576 3.24613 14.3891 4.27758C15.4205 5.30903 16 6.70798 16 8.16667H14.3333C14.3334 7.17881 13.9521 6.22906 13.269 5.51548C12.5858 4.80191 11.6536 4.37962 10.6667 4.33667V12.8333C10.6666 13.5263 10.4391 14.2001 10.0193 14.7515C9.59942 15.3028 9.0103 15.7011 8.34227 15.8855C7.67425 16.0698 6.9642 16.0299 6.32103 15.7719C5.67786 15.5139 5.13708 15.052 4.78163 14.4571C4.42618 13.8622 4.27568 13.1672 4.35322 12.4786C4.43076 11.7899 4.73205 11.1457 5.21089 10.6448C5.68972 10.1438 6.31967 9.81379 7.00411 9.70527C7.68855 9.59675 8.38969 9.71574 9 10.044V2.66667ZM7.5 11.3333C7.89782 11.3333 8.27936 11.4914 8.56066 11.7727C8.84196 12.054 9 12.4355 9 12.8333C9 13.2312 8.84196 13.6127 8.56066 13.894C8.27936 14.1753 7.89782 14.3333 7.5 14.3333C7.10218 14.3333 6.72064 14.1753 6.43934 13.894C6.15804 13.6127 6 13.2312 6 12.8333C6 12.4355 6.15804 12.054 6.43934 11.7727C6.72064 11.4914 7.10218 11.3333 7.5 11.3333Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_207_121">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const VoicemailborderIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M13.3327 2.66406H2.66602C2.13558 2.66406 1.62687 2.87478 1.2518 3.24985C0.876729 3.62492 0.666016 4.13363 0.666016 4.66406V11.3307C0.666016 11.8612 0.876729 12.3699 1.2518 12.7449C1.62687 13.12 2.13558 13.3307 2.66602 13.3307H13.3327C13.8631 13.3307 14.3718 13.12 14.7469 12.7449C15.122 12.3699 15.3327 11.8612 15.3327 11.3307V4.66406C15.3327 4.13363 15.122 3.62492 14.7469 3.24985C14.3718 2.87478 13.8631 2.66406 13.3327 2.66406ZM13.9993 11.3307C13.9993 11.5075 13.9291 11.6771 13.8041 11.8021C13.6791 11.9272 13.5095 11.9974 13.3327 11.9974H2.66602C2.4892 11.9974 2.31964 11.9272 2.19461 11.8021C2.06959 11.6771 1.99935 11.5075 1.99935 11.3307V4.66406C1.99935 4.48725 2.06959 4.31768 2.19461 4.19266C2.31964 4.06763 2.4892 3.9974 2.66602 3.9974H13.3327C13.5095 3.9974 13.6791 4.06763 13.8041 4.19266C13.9291 4.31768 13.9993 4.48725 13.9993 4.66406V11.3307ZM10.666 5.9974C10.3465 5.99829 10.0319 6.07572 9.74849 6.22318C9.46507 6.37065 9.2211 6.58387 9.03702 6.84499C8.85293 7.1061 8.73407 7.40753 8.6904 7.72401C8.64673 8.0405 8.67952 8.36285 8.78602 8.66406H7.21268C7.35428 8.26356 7.36468 7.82838 7.24238 7.42158C7.12007 7.01477 6.87142 6.65748 6.53245 6.40146C6.19347 6.14544 5.78179 6.004 5.35704 5.99763C4.9323 5.99126 4.51656 6.1203 4.17006 6.36604C3.82357 6.61178 3.56432 6.96146 3.42987 7.36442C3.29543 7.76737 3.29278 8.20267 3.4223 8.60723C3.55183 9.0118 3.8068 9.36461 4.15028 9.61456C4.49375 9.8645 4.90789 9.99859 5.33268 9.9974H10.666C11.1964 9.9974 11.7052 9.78668 12.0802 9.41161C12.4553 9.03654 12.666 8.52783 12.666 7.9974C12.666 7.46696 12.4553 6.95825 12.0802 6.58318C11.7052 6.20811 11.1964 5.9974 10.666 5.9974ZM5.33268 8.66406C5.20083 8.66406 5.07194 8.62496 4.9623 8.55171C4.85267 8.47846 4.76722 8.37434 4.71676 8.25252C4.6663 8.1307 4.6531 7.99666 4.67883 7.86734C4.70455 7.73802 4.76804 7.61923 4.86128 7.52599C4.95451 7.43276 5.0733 7.36926 5.20262 7.34354C5.33194 7.31782 5.46599 7.33102 5.5878 7.38148C5.70962 7.43193 5.81374 7.51738 5.887 7.62702C5.96025 7.73665 5.99935 7.86554 5.99935 7.9974C5.99935 8.17421 5.92911 8.34378 5.80409 8.4688C5.67906 8.59382 5.50949 8.66406 5.33268 8.66406ZM10.666 8.66406C10.5342 8.66406 10.4053 8.62496 10.2956 8.55171C10.186 8.47846 10.1006 8.37434 10.0501 8.25252C9.99964 8.1307 9.98644 7.99666 10.0122 7.86734C10.0379 7.73802 10.1014 7.61923 10.1946 7.52599C10.2878 7.43276 10.4066 7.36926 10.536 7.34354C10.6653 7.31782 10.7993 7.33102 10.9211 7.38148C11.043 7.43193 11.1471 7.51738 11.2203 7.62702C11.2936 7.73665 11.3327 7.86554 11.3327 7.9974C11.3327 8.17421 11.2624 8.34378 11.1374 8.4688C11.0124 8.59382 10.8428 8.66406 10.666 8.66406Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const NotesIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {' '}
      <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"></path>
      <path d="M2 6h4"></path>
      <path d="M2 10h4"></path>
      <path d="M2 14h4"></path>
      <path d="M2 18h4"></path>
      <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"></path>
    </svg>
  );
};

export const AnnouncementIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      version="1.1"
      viewBox="0 0 17 17"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g></g>
      <path d="M16.469 2.222h-1.927c-0.292 0-0.531 0.234-0.531 0.521v0.667l-10.995 4.030v-0.27c0-0.43-0.358-0.781-0.797-0.781h-1.422c-0.439 0-0.797 0.351-0.797 0.781v4.688c0 0.429 0.358 0.781 0.797 0.781h1.422c0.438 0 0.797-0.352 0.797-0.781v-0.331l1.034 0.189c-0.023 0.163-0.038 0.326-0.038 0.491 0 1.897 1.561 3.441 3.479 3.441 1.657 0 3.030-1.128 3.38-2.682l3.14 0.576v0.659c0 0.287 0.239 0.521 0.531 0.521h1.927c0.292 0 0.531-0.234 0.531-0.521v-11.458c0-0.287-0.239-0.521-0.531-0.521zM7.491 14.648c-1.367 0-2.479-1.095-2.479-2.441 0-0.104 0.027-0.205 0.040-0.308l4.84 0.888c-0.264 1.082-1.235 1.861-2.401 1.861zM16 13.722h-0.989v-1.013l-12.995-2.383v1.312h-1.016v-4.25h1.016v1.484l12.995-4.763v-0.887h0.989v10.5z"></path>
    </svg>
  );
};
export const ConnectIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="15"
      height="14"
      viewBox="0 0 15 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.9255 8.64458L10.0975 7.82792L10.9255 6.99958C11.221 6.70403 11.4212 6.35597 11.5261 5.95542C11.6311 5.55486 11.6311 5.15431 11.5261 4.75375C11.4212 4.35319 11.219 4.00319 10.9197 3.70375C10.6204 3.40431 10.2705 3.20208 9.87007 3.09708C9.46966 2.99208 9.06925 2.99208 8.66883 3.09708C8.26842 3.20208 7.92049 3.40236 7.62504 3.69792L6.797 4.52625L5.98063 3.69792L6.797 2.86958C7.24795 2.42625 7.77665 2.12292 8.3831 1.95958C8.974 1.80403 9.56879 1.80403 10.1675 1.95958C10.7739 2.12292 11.3007 2.42819 11.7477 2.87542C12.1948 3.32264 12.5 3.84958 12.6632 4.45625C12.8187 5.05514 12.8187 5.65014 12.6632 6.24125C12.5 6.84792 12.1967 7.37681 11.7536 7.82792L10.9255 8.64458ZM9.26945 10.3012L8.45308 11.1296C8.00213 11.5729 7.47343 11.8762 6.86698 12.0396C6.27608 12.1951 5.68129 12.1951 5.08262 12.0396C4.47617 11.8762 3.94941 11.571 3.50235 11.1237C3.05528 10.6765 2.75011 10.1496 2.58684 9.54292C2.43134 8.94403 2.43134 8.34903 2.58684 7.75792C2.75011 7.15125 3.05334 6.62236 3.49651 6.17125L4.32455 5.35458L5.15259 6.17125L4.32455 6.99958C4.0291 7.29514 3.8289 7.64319 3.72393 8.04375C3.61897 8.44431 3.61897 8.84486 3.72393 9.24542C3.8289 9.64597 4.03105 9.99597 4.33038 10.2954C4.62972 10.5949 4.9796 10.7971 5.38001 10.9021C5.78042 11.0071 6.18083 11.0071 6.58125 10.9021C6.98166 10.7971 7.32959 10.5968 7.62504 10.3012L8.45308 9.47292L9.26945 10.3012ZM9.26945 4.52625L10.0975 5.35458L5.98063 9.47292L5.15259 8.64458L9.26945 4.52625Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const FacebookIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.4583 11.2487H14.5412L15.3743 7.91537H12.4583V6.2487C12.4583 5.87092 12.475 5.5987 12.5083 5.43203C12.575 5.16537 12.7194 4.95981 12.9416 4.81537C13.2082 4.65981 13.6025 4.58203 14.1246 4.58203H15.3743V1.78203C15.1854 1.75981 14.8855 1.73759 14.4745 1.71537C13.9635 1.68203 13.4692 1.66537 12.9915 1.66537C12.2251 1.66537 11.5502 1.81814 10.967 2.1237C10.3839 2.42925 9.93675 2.86537 9.62571 3.43203C9.29246 4.04314 9.12584 4.75981 9.12584 5.58203V7.91537H6.62646V11.2487H9.12584V18.332H12.4583V11.2487Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const InstagramLineIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.3205 7.4987C10.8651 7.4987 10.4457 7.60981 10.0625 7.83203C9.67925 8.05425 9.37655 8.35703 9.15438 8.74037C8.93222 9.1237 8.82113 9.54314 8.82113 9.9987C8.82113 10.4543 8.93222 10.8737 9.15438 11.257C9.37655 11.6404 9.67925 11.9431 10.0625 12.1654C10.4457 12.3876 10.8651 12.4987 11.3205 12.4987C11.7759 12.4987 12.1953 12.3876 12.5785 12.1654C12.9618 11.9431 13.2645 11.6404 13.4866 11.257C13.7088 10.8737 13.8199 10.4543 13.8199 9.9987C13.8199 9.54314 13.7088 9.1237 13.4866 8.74037C13.2645 8.35703 12.9618 8.05425 12.5785 7.83203C12.1953 7.60981 11.7759 7.4987 11.3205 7.4987ZM11.3205 5.83203C12.0759 5.83203 12.7729 6.01814 13.4117 6.39037C14.0504 6.76259 14.5558 7.26814 14.9279 7.90703C15.3001 8.54592 15.4861 9.24314 15.4861 9.9987C15.4861 10.7543 15.3001 11.4515 14.9279 12.0904C14.5558 12.7293 14.0504 13.2348 13.4117 13.607C12.7729 13.9793 12.0759 14.1654 11.3205 14.1654C10.5651 14.1654 9.86809 13.9793 9.22936 13.607C8.59064 13.2348 8.08521 12.7293 7.71308 12.0904C7.34095 11.4515 7.15488 10.7543 7.15488 9.9987C7.15488 9.24314 7.34095 8.54592 7.71308 7.90703C8.08521 7.26814 8.59064 6.76259 9.22936 6.39037C9.86809 6.01814 10.5651 5.83203 11.3205 5.83203ZM16.7358 5.61537C16.7358 5.90425 16.6331 6.15148 16.4276 6.35703C16.2221 6.56259 15.9777 6.66537 15.6944 6.66537C15.4112 6.66537 15.1668 6.56259 14.9613 6.35703C14.7558 6.15148 14.653 5.90703 14.653 5.6237C14.653 5.34037 14.7558 5.09592 14.9613 4.89037C15.1668 4.68481 15.4112 4.58203 15.6944 4.58203C15.9777 4.58203 16.2221 4.68481 16.4276 4.89037C16.6331 5.09592 16.7358 5.33759 16.7358 5.61537ZM11.3205 3.33203C10.2985 3.33203 9.60427 3.33481 9.2377 3.34037C8.87112 3.34592 8.449 3.35981 7.97135 3.38203C7.3715 3.40425 6.87162 3.49314 6.47172 3.6487C6.12736 3.78203 5.82466 3.97925 5.56361 4.24037C5.30257 4.50148 5.1054 4.80425 4.9721 5.1487C4.81658 5.5487 4.72771 6.0487 4.7055 6.6487C4.68328 7.10425 4.66939 7.51259 4.66384 7.8737C4.65829 8.23481 4.65551 8.94314 4.65551 9.9987C4.65551 11.0209 4.65829 11.7154 4.66384 12.082C4.66939 12.4487 4.68328 12.8709 4.7055 13.3487C4.72771 13.9487 4.81658 14.4487 4.9721 14.8487C5.1054 15.1931 5.30257 15.4959 5.56361 15.757C5.82466 16.0181 6.12736 16.2098 6.47172 16.332C6.87162 16.4987 7.3715 16.5931 7.97135 16.6154C8.42679 16.6376 8.83502 16.6515 9.19604 16.657C9.55706 16.6626 10.2652 16.6654 11.3205 16.6654C12.3425 16.6654 13.0367 16.6626 13.4033 16.657C13.7699 16.6515 14.192 16.6376 14.6697 16.6154C15.2695 16.5931 15.7694 16.5043 16.1693 16.3487C16.5137 16.2154 16.8164 16.0181 17.0774 15.757C17.3384 15.4959 17.5301 15.1931 17.6523 14.8487C17.8189 14.4487 17.9133 13.9487 17.9355 13.3487C17.9577 12.8931 17.9716 12.4848 17.9772 12.1237C17.9827 11.7626 17.9855 11.0543 17.9855 9.9987C17.9855 8.97648 17.9827 8.28203 17.9772 7.91537C17.9716 7.5487 17.9577 7.12648 17.9355 6.6487C17.9133 6.0487 17.8244 5.5487 17.6689 5.1487C17.5356 4.80425 17.3384 4.50148 17.0774 4.24037C16.8164 3.97925 16.5137 3.78203 16.1693 3.6487C15.7694 3.49314 15.2695 3.40425 14.6697 3.38203C14.2142 3.35981 13.806 3.34592 13.445 3.34037C13.084 3.33481 12.3758 3.33203 11.3205 3.33203ZM11.3205 1.66537C12.4091 1.66537 13.1534 1.67092 13.5533 1.68203C13.8865 1.68203 14.2864 1.69314 14.753 1.71537C15.5306 1.7487 16.2026 1.87648 16.7691 2.0987C17.3357 2.32092 17.83 2.64314 18.2521 3.06537C18.6742 3.48759 18.9964 3.98203 19.2185 4.5487C19.4407 5.11537 19.5684 5.78759 19.6018 6.56536C19.624 7.04314 19.6351 7.44314 19.6351 7.76537C19.6462 8.18759 19.6518 8.93759 19.6518 10.0154C19.6518 11.0931 19.6462 11.832 19.6351 12.232C19.6351 12.5654 19.624 12.9654 19.6018 13.432C19.5684 14.2098 19.4407 14.882 19.2185 15.4487C18.9964 16.0154 18.6742 16.5098 18.2521 16.932C17.83 17.3543 17.3357 17.6765 16.7691 17.8987C16.2026 18.1209 15.5306 18.2487 14.753 18.282C14.2753 18.3043 13.8754 18.3154 13.5533 18.3154C13.1312 18.3265 12.3814 18.332 11.3038 18.332C10.2263 18.332 9.48763 18.3265 9.08773 18.3154C8.75448 18.3154 8.35458 18.3043 7.88803 18.282C7.11045 18.2487 6.4384 18.1209 5.87187 17.8987C5.30535 17.6765 4.81102 17.3543 4.38891 16.932C3.96679 16.5098 3.64465 16.0154 3.42248 15.4487C3.20032 14.882 3.07257 14.2098 3.03925 13.432C3.01703 12.9543 3.00592 12.5543 3.00592 12.232C2.99481 11.8098 2.98926 11.0598 2.98926 9.98203C2.98926 8.90425 2.99481 8.16537 3.00592 7.76537C3.00592 7.43203 3.01703 7.03203 3.03925 6.56536C3.07257 5.78759 3.20032 5.11537 3.42248 4.5487C3.64465 3.98203 3.96679 3.48759 4.38891 3.06537C4.81102 2.64314 5.30535 2.32092 5.87187 2.0987C6.4384 1.87648 7.11045 1.7487 7.88803 1.71537C8.36569 1.69314 8.76559 1.68203 9.08773 1.68203C9.50985 1.67092 10.2541 1.66537 11.3205 1.66537Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const WhatsappLineIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="22"
      height="20"
      viewBox="0 0 22 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6.69962 15.4154L7.29947 15.7654C8.33255 16.3654 9.45171 16.6654 10.657 16.6654C11.8622 16.6654 12.9814 16.3598 14.0145 15.7487C15.0142 15.1598 15.8085 14.3654 16.3972 13.3654C17.0082 12.332 17.3136 11.2098 17.3136 9.9987C17.3136 8.78759 17.0082 7.66537 16.3972 6.63203C15.8085 5.63203 15.0142 4.83759 14.0145 4.2487C12.9814 3.63759 11.8594 3.33203 10.6486 3.33203C9.43782 3.33203 8.31588 3.63759 7.28281 4.2487C6.28306 4.83759 5.48881 5.63203 4.90007 6.63203C4.28911 7.66537 3.98363 8.78481 3.98363 9.99037C3.98363 11.1959 4.28356 12.3154 4.88341 13.3487L5.23332 13.9487L4.70012 15.9487L6.69962 15.4154ZM2.31738 18.332L3.45043 14.1987C3.08386 13.5654 2.80337 12.8959 2.60898 12.1904C2.41458 11.4848 2.31738 10.7543 2.31738 9.9987C2.31738 8.86537 2.534 7.78203 2.96722 6.7487C3.38934 5.75981 3.98641 4.87925 4.75844 4.10703C5.53047 3.33481 6.4108 2.73759 7.39945 2.31536C8.43252 1.88203 9.51558 1.66537 10.6486 1.66537C11.7817 1.66537 12.8647 1.88203 13.8978 2.31536C14.8865 2.73759 15.7668 3.33481 16.5388 4.10703C17.3109 4.87925 17.9079 5.75981 18.33 6.7487C18.7633 7.78203 18.9799 8.86537 18.9799 9.9987C18.9799 11.132 18.7633 12.2154 18.33 13.2487C17.9079 14.2376 17.3109 15.1181 16.5388 15.8904C15.7668 16.6626 14.8865 17.2598 13.8978 17.682C12.8647 18.1154 11.7817 18.332 10.6486 18.332C9.89327 18.332 9.16289 18.2348 8.45751 18.0404C7.75214 17.8459 7.08286 17.5654 6.44968 17.1987L2.31738 18.332ZM7.64938 6.08203C7.76047 6.08203 7.87155 6.08203 7.98263 6.08203L8.11593 6.0987C8.18258 6.10981 8.24646 6.13481 8.30755 6.1737C8.36865 6.21259 8.4103 6.25425 8.43252 6.2987C8.68801 6.86537 8.9324 7.43203 9.16567 7.9987C9.22121 8.13203 9.19344 8.28203 9.08236 8.4487C9.02682 8.5487 8.95461 8.65425 8.86575 8.76537L8.56582 9.0987L8.5325 9.16537C8.51028 9.22092 8.50472 9.27092 8.51583 9.31536C8.52694 9.35981 8.55471 9.42092 8.59915 9.4987L8.64913 9.58203C8.8713 9.9487 9.15456 10.2987 9.49892 10.632L9.79885 10.9154C10.1987 11.2709 10.6375 11.5487 11.1152 11.7487L11.3318 11.8487C11.3873 11.8709 11.4373 11.8876 11.4818 11.8987L11.5484 11.9154C11.6373 11.9154 11.7206 11.8765 11.7983 11.7987C12.2205 11.2765 12.4371 11.0154 12.4482 11.0154C12.5259 10.9376 12.6315 10.9043 12.7648 10.9154C12.8203 10.9154 12.8703 10.9265 12.9147 10.9487L14.5643 11.682C14.6088 11.7043 14.6476 11.7348 14.681 11.7737C14.7143 11.8126 14.7309 11.8543 14.7309 11.8987V11.9154C14.7309 12.0154 14.7254 12.1154 14.7143 12.2154C14.681 12.4709 14.631 12.6765 14.5643 12.832C14.5199 12.9209 14.4588 13.0043 14.381 13.082C14.3033 13.1598 14.2144 13.2376 14.1144 13.3154L14.0145 13.3987C13.9145 13.4543 13.8034 13.5154 13.6812 13.582C13.4701 13.6931 13.2424 13.7543 12.998 13.7654H12.9314C12.7537 13.7765 12.6204 13.782 12.5315 13.782L12.0483 13.6987C10.8486 13.3876 9.78218 12.8209 8.84908 11.9987C8.74911 11.9098 8.59915 11.7654 8.3992 11.5654L8.31588 11.482C7.58273 10.7487 7.03842 9.98759 6.68296 9.1987C6.49412 8.78759 6.3997 8.39314 6.3997 8.01537C6.3997 7.49314 6.55521 7.02648 6.86625 6.61537L6.89957 6.58203C6.96622 6.49314 7.02732 6.42092 7.08286 6.36537C7.18283 6.26537 7.26615 6.1987 7.3328 6.16537C7.42166 6.12092 7.52719 6.09314 7.64938 6.08203Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const WebhookIcon = ({ className }: IconProps) => {
  return (
    <svg
      data-v-14c8c335=""
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} lucide lucide-icon customizable lucide-webhook-icon lucide-webhook lucide-icon customizable`}
    >
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"></path>
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"></path>
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"></path>
    </svg>
  );
};
export const ZapierIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="0"
      role="img"
      viewBox="0 0 24 24"
      className={className}
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.157 0A4.151 4.151 0 0 0 0 4.161v15.678A4.151 4.151 0 0 0 4.157 24h15.682A4.152 4.152 0 0 0 24 19.839V4.161A4.152 4.152 0 0 0 19.839 0H4.157Zm10.61 8.761h.03a.577.577 0 0 1 .23.038.585.585 0 0 1 .201.124.63.63 0 0 1 .162.431.612.612 0 0 1-.162.435.58.58 0 0 1-.201.128.58.58 0 0 1-.23.042.529.529 0 0 1-.235-.042.585.585 0 0 1-.332-.328.559.559 0 0 1-.038-.235.613.613 0 0 1 .17-.431.59.59 0 0 1 .405-.162Zm2.853 1.572c.03.004.061.004.095.004.325-.011.646.064.937.219.238.144.431.355.552.609.128.279.189.582.185.888v.193a2 2 0 0 1 0 .219h-2.498c.003.227.075.45.204.642a.78.78 0 0 0 .646.265.714.714 0 0 0 .484-.136.642.642 0 0 0 .23-.318l.915.257a1.398 1.398 0 0 1-.28.537c-.14.159-.321.284-.521.355a2.234 2.234 0 0 1-.836.136 1.923 1.923 0 0 1-1.001-.245 1.618 1.618 0 0 1-.665-.703 2.221 2.221 0 0 1-.227-1.036 1.95 1.95 0 0 1 .48-1.398 1.9 1.9 0 0 1 1.3-.488Zm-9.607.023c.162.004.325.026.48.079.207.065.4.174.563.314.26.302.393.692.366 1.088v2.276H8.53l-.109-.711h-.065c-.064.163-.155.31-.272.439a1.122 1.122 0 0 1-.374.264 1.023 1.023 0 0 1-.453.083 1.334 1.334 0 0 1-.866-.264.965.965 0 0 1-.329-.801.993.993 0 0 1 .076-.431 1.02 1.02 0 0 1 .242-.363 1.478 1.478 0 0 1 1.043-.303h.952v-.181a.696.696 0 0 0-.136-.454.553.553 0 0 0-.438-.154.695.695 0 0 0-.378.086.48.48 0 0 0-.193.254l-.99-.144a1.26 1.26 0 0 1 .257-.563c.14-.174.321-.302.533-.378.261-.091.54-.136.82-.129.053-.003.106-.007.163-.007Zm4.384.007c.174 0 .347.038.506.114.182.083.34.211.458.374.257.423.377.911.351 1.406a2.53 2.53 0 0 1-.355 1.448 1.148 1.148 0 0 1-1.009.517c-.204 0-.401-.045-.582-.136a1.052 1.052 0 0 1-.48-.457 1.298 1.298 0 0 1-.114-.234h-.045l.004 1.784h-1.059v-4.713h.904l.117.805h.057c.068-.208.177-.401.328-.56a1.129 1.129 0 0 1 .843-.344h.076v-.004Zm7.559.084h.903l.113.805h.053a1.37 1.37 0 0 1 .235-.484.813.813 0 0 1 .313-.242.82.82 0 0 1 .39-.076h.234v1.051h-.401a.662.662 0 0 0-.313.008.623.623 0 0 0-.272.155.663.663 0 0 0-.174.26.683.683 0 0 0-.027.314v1.875h-1.054v-3.666Zm-17.515.003h3.262v.896L3.73 13.104l.034.113h1.973l.042.9H2.4v-.9l1.931-1.754-.045-.117H2.441v-.896Zm11.815 0h1.055v3.659h-1.055V10.45Zm3.443.684.019.016a.69.69 0 0 0-.351.045.756.756 0 0 0-.287.204c-.11.155-.174.336-.189.522h1.545c-.034-.526-.257-.787-.74-.787h.003Zm-5.718.163c-.026 0-.057 0-.083.004a.78.78 0 0 0-.31.053.746.746 0 0 0-.257.189 1.016 1.016 0 0 0-.204.695v.064c-.015.257.057.507.204.711a.634.634 0 0 0 .253.196.638.638 0 0 0 .314.061.644.644 0 0 0 .578-.265c.14-.223.204-.48.189-.74a1.216 1.216 0 0 0-.181-.711.677.677 0 0 0-.503-.257Zm-4.509 1.266a.464.464 0 0 0-.268.102.373.373 0 0 0-.114.276c0 .053.008.106.027.155a.375.375 0 0 0 .087.132.576.576 0 0 0 .397.11v.004a.863.863 0 0 0 .563-.182.573.573 0 0 0 .211-.457v-.14h-.903Z"></path>
    </svg>
  );
};

export const PhoneForwardingIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      strokeWidth="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="none" d="M0 0h24v24H0V0z"></path>
      <path d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm1 17H7V4h10v14zm-3 3h-4v-1h4v1z"></path>
    </svg>
  );
};

export const ActivityIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 12h4l3 8l4 -16l3 8h4"></path>
    </svg>
  );
};
export const PredictiveDialerIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="22"
      viewBox="0 0 24 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M3.99902 11.4443H5.77527V19.4424H3.99902V11.4443ZM18.209 7.88965H19.9853V19.4424H18.209V7.88965ZM11.104 2.55762H12.8803V19.4424H11.104V2.55762Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SkipIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12.002 22.7499C6.80203 22.7499 2.58203 18.5199 2.58203 13.3299C2.58203 8.1399 6.80203 3.8999 12.002 3.8999C13.072 3.8999 14.112 4.0499 15.112 4.3599C15.512 4.4799 15.732 4.8999 15.612 5.2999C15.492 5.6999 15.072 5.9199 14.672 5.7999C13.822 5.5399 12.922 5.3999 12.002 5.3999C7.63203 5.3999 4.08203 8.9499 4.08203 13.3199C4.08203 17.6899 7.63203 21.2399 12.002 21.2399C16.372 21.2399 19.922 17.6899 19.922 13.3199C19.922 11.7399 19.462 10.2199 18.592 8.9199C18.362 8.5799 18.452 8.1099 18.802 7.8799C19.142 7.6499 19.612 7.7399 19.842 8.0899C20.882 9.6399 21.432 11.4499 21.432 13.3299C21.422 18.5199 17.202 22.7499 12.002 22.7499Z"
        fill="currentColor"
      />
      <path
        d="M16.1324 6.06996C15.9224 6.06996 15.7124 5.97996 15.5624 5.80996L12.6724 2.48996C12.4024 2.17996 12.4324 1.69996 12.7424 1.42996C13.0524 1.15996 13.5324 1.18996 13.8024 1.49996L16.6924 4.81996C16.9624 5.12996 16.9324 5.60996 16.6224 5.87996C16.4924 6.00996 16.3124 6.06996 16.1324 6.06996Z"
        fill="currentColor"
      />
      <path
        d="M12.7622 8.52996C12.5322 8.52996 12.3022 8.41996 12.1522 8.21996C11.9122 7.88996 11.9822 7.41996 12.3122 7.16996L15.6822 4.70996C16.0122 4.45996 16.4822 4.53996 16.7322 4.86996C16.9822 5.19996 16.9022 5.66996 16.5722 5.91996L13.2022 8.38996C13.0722 8.48996 12.9222 8.52996 12.7622 8.52996Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MissedCallIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19.0599 5.99992L20.2999 4.75992C20.5899 4.46992 20.5899 3.98992 20.2999 3.69992C20.0099 3.40992 19.5299 3.40992 19.2399 3.69992L17.9999 4.93992L16.7599 3.69992C16.4699 3.40992 15.9899 3.40992 15.6999 3.69992C15.4099 3.98992 15.4099 4.46992 15.6999 4.75992L16.9399 5.99992L15.6999 7.23992C15.4099 7.52992 15.4099 8.00992 15.6999 8.29992C15.8499 8.44992 16.0399 8.51992 16.2299 8.51992C16.4199 8.51992 16.6099 8.44992 16.7599 8.29992L17.9999 7.05992L19.2399 8.29992C19.3899 8.44992 19.5799 8.51992 19.7699 8.51992C19.9599 8.51992 20.1499 8.44992 20.2999 8.29992C20.5899 8.00992 20.5899 7.52992 20.2999 7.23992L19.0599 5.99992Z"
        fill="#3D4754"
      />
      <path
        opacity="0.4"
        d="M11.79 14.21L8.52 17.48C8.16 17.16 7.81 16.83 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.09 13.57 11.44 13.91 11.79 14.21Z"
        fill="#3D4754"
      />
      <path
        d="M21.9701 18.33C21.9701 18.61 21.9201 18.9 21.8201 19.18C21.7901 19.26 21.7601 19.34 21.7201 19.42C21.5501 19.78 21.3301 20.12 21.0401 20.44C20.5501 20.98 20.0101 21.37 19.4001 21.62C19.3901 21.62 19.3801 21.63 19.3701 21.63C18.7801 21.87 18.1401 22 17.4501 22C16.4301 22 15.3401 21.76 14.1901 21.27C13.0401 20.78 11.8901 20.12 10.7501 19.29C10.3601 19 9.9701 18.71 9.6001 18.4L12.8701 15.13C13.1501 15.34 13.4001 15.5 13.6101 15.61C13.6601 15.63 13.7201 15.66 13.7901 15.69C13.8701 15.72 13.9501 15.73 14.0401 15.73C14.2101 15.73 14.3401 15.67 14.4501 15.56L15.2101 14.81C15.4601 14.56 15.7001 14.37 15.9301 14.25C16.1601 14.11 16.3901 14.04 16.6401 14.04C16.8301 14.04 17.0301 14.08 17.2501 14.17C17.4701 14.26 17.7001 14.39 17.9501 14.56L21.2601 16.91C21.5201 17.09 21.7001 17.3 21.8101 17.55C21.9101 17.8 21.9701 18.05 21.9701 18.33Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const OutboundCallIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M20 9.55C19.59 9.55 19.25 9.21 19.25 8.8V4.75H15.2C14.79 4.75 14.45 4.41 14.45 4C14.45 3.59 14.79 3.25 15.2 3.25H20C20.41 3.25 20.75 3.59 20.75 4V8.8C20.75 9.21 20.41 9.55 20 9.55Z"
        fill="currentColor"
      />
      <path
        opacity="0.4"
        d="M11.79 14.21L8.52 17.48C8.16 17.16 7.81 16.83 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.09 13.57 11.44 13.91 11.79 14.21Z"
        fill="#3D4754"
      />
      <path
        d="M21.9701 18.33C21.9701 18.61 21.9201 18.9 21.8201 19.18C21.7901 19.26 21.7601 19.34 21.7201 19.42C21.5501 19.78 21.3301 20.12 21.0401 20.44C20.5501 20.98 20.0101 21.37 19.4001 21.62C19.3901 21.62 19.3801 21.63 19.3701 21.63C18.7801 21.87 18.1401 22 17.4501 22C16.4301 22 15.3401 21.76 14.1901 21.27C13.0401 20.78 11.8901 20.12 10.7501 19.29C10.3601 19 9.9701 18.71 9.6001 18.4L12.8701 15.13C13.1501 15.34 13.4001 15.5 13.6101 15.61C13.6601 15.63 13.7201 15.66 13.7901 15.69C13.8701 15.72 13.9501 15.73 14.0401 15.73C14.2101 15.73 14.3401 15.67 14.4501 15.56L15.2101 14.81C15.4601 14.56 15.7001 14.37 15.9301 14.25C16.1601 14.11 16.3901 14.04 16.6401 14.04C16.8301 14.04 17.0301 14.08 17.2501 14.17C17.4701 14.26 17.7001 14.39 17.9501 14.56L21.2601 16.91C21.5201 17.09 21.7001 17.3 21.8101 17.55C21.9101 17.8 21.9701 18.05 21.9701 18.33Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const InboundCallIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M21 8.55H16.2C15.79 8.55 15.45 8.21 15.45 7.8V3C15.45 2.59 15.79 2.25 16.2 2.25C16.61 2.25 16.95 2.59 16.95 3V7.05H21C21.41 7.05 21.75 7.39 21.75 7.8C21.75 8.21 21.41 8.55 21 8.55Z"
        fill="currentColor"
      />
      <path
        opacity="0.4"
        d="M11.79 14.21L8.52 17.48C8.16 17.16 7.81 16.83 7.47 16.49C6.44 15.45 5.51 14.36 4.68 13.22C3.86 12.08 3.2 10.94 2.72 9.81C2.24 8.67 2 7.58 2 6.54C2 5.86 2.12 5.21 2.36 4.61C2.6 4 2.98 3.44 3.51 2.94C4.15 2.31 4.85 2 5.59 2C5.87 2 6.15 2.06 6.4 2.18C6.66 2.3 6.89 2.48 7.07 2.74L9.39 6.01C9.57 6.26 9.7 6.49 9.79 6.71C9.88 6.92 9.93 7.13 9.93 7.32C9.93 7.56 9.86 7.8 9.72 8.03C9.59 8.26 9.4 8.5 9.16 8.74L8.4 9.53C8.29 9.64 8.24 9.77 8.24 9.93C8.24 10.01 8.25 10.08 8.27 10.16C8.3 10.24 8.33 10.3 8.35 10.36C8.53 10.69 8.84 11.12 9.28 11.64C9.73 12.16 10.21 12.69 10.73 13.22C11.09 13.57 11.44 13.91 11.79 14.21Z"
        fill="#3D4754"
      />
      <path
        d="M21.9701 18.33C21.9701 18.61 21.9201 18.9 21.8201 19.18C21.7901 19.26 21.7601 19.34 21.7201 19.42C21.5501 19.78 21.3301 20.12 21.0401 20.44C20.5501 20.98 20.0101 21.37 19.4001 21.62C19.3901 21.62 19.3801 21.63 19.3701 21.63C18.7801 21.87 18.1401 22 17.4501 22C16.4301 22 15.3401 21.76 14.1901 21.27C13.0401 20.78 11.8901 20.12 10.7501 19.29C10.3601 19 9.9701 18.71 9.6001 18.4L12.8701 15.13C13.1501 15.34 13.4001 15.5 13.6101 15.61C13.6601 15.63 13.7201 15.66 13.7901 15.69C13.8701 15.72 13.9501 15.73 14.0401 15.73C14.2101 15.73 14.3401 15.67 14.4501 15.56L15.2101 14.81C15.4601 14.56 15.7001 14.37 15.9301 14.25C16.1601 14.11 16.3901 14.04 16.6401 14.04C16.8301 14.04 17.0301 14.08 17.2501 14.17C17.4701 14.26 17.7001 14.39 17.9501 14.56L21.2601 16.91C21.5201 17.09 21.7001 17.3 21.8101 17.55C21.9101 17.8 21.9701 18.05 21.9701 18.33Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const HashIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M22.2689 8.00048H17.8289L18.8622 2.84048C18.8967 2.66367 18.8595 2.4804 18.7589 2.331C18.6582 2.18159 18.5024 2.07829 18.3255 2.04381C18.1487 2.00933 17.9655 2.0465 17.8161 2.14715C17.6667 2.24779 17.5634 2.40367 17.5289 2.58048L16.4689 8.00048H11.0089L12.0422 2.84048C12.0593 2.75293 12.0589 2.66287 12.0412 2.57546C12.0235 2.48804 11.9887 2.40497 11.9389 2.331C11.889 2.25702 11.8251 2.19358 11.7508 2.14431C11.6764 2.09503 11.5931 2.06088 11.5055 2.04381C11.3287 2.00933 11.1455 2.0465 10.9961 2.14715C10.8467 2.24779 10.7434 2.40367 10.7089 2.58048L9.64888 8.00048H4.93555C4.75874 8.00048 4.58917 8.07071 4.46414 8.19574C4.33912 8.32076 4.26888 8.49033 4.26888 8.66714C4.26888 8.84395 4.33912 9.01352 4.46414 9.13855C4.58917 9.26357 4.75874 9.33381 4.93555 9.33381H9.38221L8.31555 14.6671H3.60221C3.4254 14.6671 3.25583 14.7374 3.13081 14.8624C3.00578 14.9874 2.93555 15.157 2.93555 15.3338C2.93555 15.5106 3.00578 15.6802 3.13081 15.8052C3.25583 15.9302 3.4254 16.0005 3.60221 16.0005H8.04221L7.00888 21.1605C6.97561 21.3337 7.01235 21.5131 7.11107 21.6593C7.20979 21.8055 7.36242 21.9066 7.53555 21.9405C7.57976 21.9469 7.62467 21.9469 7.66888 21.9405C7.82484 21.9436 7.97697 21.892 8.09879 21.7945C8.2206 21.6971 8.30438 21.56 8.33555 21.4071L9.40221 16.0005H14.8622L13.8289 21.1605C13.7956 21.3337 13.8324 21.5131 13.9311 21.6593C14.0298 21.8055 14.1824 21.9066 14.3555 21.9405C14.3975 21.9472 14.4403 21.9472 14.4822 21.9405C14.6382 21.9436 14.7903 21.892 14.9121 21.7945C15.0339 21.6971 15.1177 21.56 15.1489 21.4071L16.2222 16.0005H20.9355C21.1124 16.0005 21.2819 15.9302 21.407 15.8052C21.532 15.6802 21.6022 15.5106 21.6022 15.3338C21.6022 15.157 21.532 14.9874 21.407 14.8624C21.2819 14.7374 21.1124 14.6671 20.9355 14.6671H16.4889L17.5622 9.33381H22.2689C22.4457 9.33381 22.6153 9.26357 22.7403 9.13855C22.8653 9.01352 22.9355 8.84395 22.9355 8.66714C22.9355 8.49033 22.8653 8.32076 22.7403 8.19574C22.6153 8.07071 22.4457 8.00048 22.2689 8.00048ZM15.1289 14.6671H9.66888L10.7422 9.33381H16.2022L15.1289 14.6671Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AllNumberIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M19.9355 3H5.93555C4.83098 3 3.93555 3.89543 3.93555 5V19C3.93555 20.1046 4.83098 21 5.93555 21H19.9355C21.0401 21 21.9355 20.1046 21.9355 19V5C21.9355 3.89543 21.0401 3 19.9355 3Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M7.93555 8H17.9355M7.93555 12H17.9355M7.93555 16H17.9355"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
export const TickCircleIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M11.5355 13.8L9.38555 11.65C9.20221 11.4667 8.96888 11.375 8.68555 11.375C8.40222 11.375 8.16888 11.4667 7.98555 11.65C7.80222 11.8333 7.71055 12.0667 7.71055 12.35C7.71055 12.6333 7.80222 12.8667 7.98555 13.05L10.8355 15.9C11.0355 16.1 11.2689 16.2 11.5355 16.2C11.8022 16.2 12.0355 16.1 12.2355 15.9L17.8855 10.25C18.0689 10.0667 18.1605 9.83333 18.1605 9.55C18.1605 9.26667 18.0689 9.03333 17.8855 8.85C17.7022 8.66667 17.4689 8.575 17.1855 8.575C16.9022 8.575 16.6689 8.66667 16.4855 8.85L11.5355 13.8ZM12.9355 22C11.5522 22 10.2522 21.7373 9.03555 21.212C7.81888 20.6867 6.76055 19.9743 5.86055 19.075C4.96055 18.1757 4.24821 17.1173 3.72355 15.9C3.19888 14.6827 2.93621 13.3827 2.93555 12C2.93488 10.6173 3.19755 9.31733 3.72355 8.1C4.24955 6.88267 4.96188 5.82433 5.86055 4.925C6.75921 4.02567 7.81755 3.31333 9.03555 2.788C10.2535 2.26267 11.5535 2 12.9355 2C14.3175 2 15.6175 2.26267 16.8355 2.788C18.0535 3.31333 19.1119 4.02567 20.0105 4.925C20.9092 5.82433 21.6219 6.88267 22.1485 8.1C22.6752 9.31733 22.9375 10.6173 22.9355 12C22.9335 13.3827 22.6709 14.6827 22.1475 15.9C21.6242 17.1173 20.9119 18.1757 20.0105 19.075C19.1092 19.9743 18.0509 20.687 16.8355 21.213C15.6202 21.739 14.3202 22.0013 12.9355 22ZM12.9355 20C15.1689 20 17.0605 19.225 18.6105 17.675C20.1605 16.125 20.9355 14.2333 20.9355 12C20.9355 9.76667 20.1605 7.875 18.6105 6.325C17.0605 4.775 15.1689 4 12.9355 4C10.7022 4 8.81055 4.775 7.26055 6.325C5.71055 7.875 4.93555 9.76667 4.93555 12C4.93555 14.2333 5.71055 16.125 7.26055 17.675C8.81055 19.225 10.7022 20 12.9355 20Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const RoleIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 13C11.0167 13 10.1873 12.6627 9.512 11.988C8.83667 11.3133 8.49933 10.484 8.5 9.5C8.50067 8.516 8.83833 7.68667 9.513 7.012C10.1877 6.33733 11.0167 6 12 6C12.9833 6 13.8127 6.33767 14.488 7.013C15.1633 7.68833 15.5007 8.51733 15.5 9.5C15.4993 10.4827 15.162 11.312 14.488 11.988C13.814 12.664 12.9847 13.0013 12 13ZM12 11C12.4333 11 12.7917 10.8583 13.075 10.575C13.3583 10.2917 13.5 9.93333 13.5 9.5C13.5 9.06667 13.3583 8.70833 13.075 8.425C12.7917 8.14167 12.4333 8 12 8C11.5667 8 11.2083 8.14167 10.925 8.425C10.6417 8.70833 10.5 9.06667 10.5 9.5C10.5 9.93333 10.6417 10.2917 10.925 10.575C11.2083 10.8583 11.5667 11 12 11ZM12 22C9.68333 21.4167 7.77067 20.0873 6.262 18.012C4.75333 15.9367 3.99933 13.6327 4 11.1V5L12 2L20 5V11.1C20 13.6333 19.246 15.9377 17.738 18.013C16.23 20.0883 14.3173 21.4173 12 22ZM12 4.125L6 6.375V11.1C6 12 6.125 12.875 6.375 13.725C6.625 14.575 6.96667 15.375 7.4 16.125C8.1 15.775 8.83333 15.5 9.6 15.3C10.3667 15.1 11.1667 15 12 15C12.8333 15 13.6333 15.1 14.4 15.3C15.1667 15.5 15.9 15.775 16.6 16.125C17.0333 15.375 17.375 14.575 17.625 13.725C17.875 12.875 18 12 18 11.1V6.375L12 4.125ZM12 17C11.4 17 10.8167 17.0667 10.25 17.2C9.68333 17.3333 9.14167 17.5167 8.625 17.75C9.10833 18.25 9.63333 18.6833 10.2 19.05C10.7667 19.4167 11.3667 19.7 12 19.9C12.6333 19.7 13.2333 19.4167 13.8 19.05C14.3667 18.6833 14.8917 18.25 15.375 17.75C14.8583 17.5167 14.3167 17.3333 13.75 17.2C13.1833 17.0667 12.6 17 12 17Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const LogsIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      className={className}
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13 12h8"></path>
      <path d="M13 18h8"></path>
      <path d="M13 6h8"></path>
      <path d="M3 12h1"></path>
      <path d="M3 18h1"></path>
      <path d="M3 6h1"></path>
      <path d="M8 12h1"></path>
      <path d="M8 18h1"></path>
      <path d="M8 6h1"></path>
    </svg>
  );
};

export const CallScriptIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      className={className}
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 3a2 2 0 0 1 2-2h9.982a2 2 0 0 1 1.414.586l4.018 4.018A2 2 0 0 1 21 7.018V21a2 2 0 0 1-2 2H4.75a.75.75 0 0 1 0-1.5H19a.5.5 0 0 0 .5-.5V8.5h-4a2 2 0 0 1-2-2v-4H5a.5.5 0 0 0-.5.5v6.25a.75.75 0 0 1-1.5 0Zm12-.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0-.146-.336l-4.018-4.018A.5.5 0 0 0 15 2.5Z"></path>
      <path d="M4.53 12.24a.75.75 0 0 1-.039 1.06l-2.639 2.45 2.64 2.45a.75.75 0 1 1-1.022 1.1l-3.23-3a.75.75 0 0 1 0-1.1l3.23-3a.75.75 0 0 1 1.06.04Zm3.979 1.06a.75.75 0 1 1 1.02-1.1l3.231 3a.75.75 0 0 1 0 1.1l-3.23 3a.75.75 0 1 1-1.021-1.1l2.639-2.45-2.64-2.45Z"></path>
    </svg>
  );
};
export const PhoneSystemIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15.9355 7V7.01M18.9355 7V7.01M21.9355 7V7.01M5.93555 4H9.93555L11.9355 9L9.43555 10.5C10.5065 12.6715 12.264 14.429 14.4355 15.5L15.9355 13L20.9355 15V19C20.9355 19.5304 20.7248 20.0391 20.3498 20.4142C19.9747 20.7893 19.466 21 18.9355 21C15.0348 20.763 11.3557 19.1065 8.59238 16.3432C5.82905 13.5798 4.1726 9.90074 3.93555 6C3.93555 5.46957 4.14626 4.96086 4.52133 4.58579C4.89641 4.21071 5.40511 4 5.93555 4Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};
export const BillingPlanIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.44444 12.4444C4.6963 12.4444 4.90756 12.3591 5.07822 12.1884C5.24889 12.0178 5.33393 11.8068 5.33333 11.5556C5.33274 11.3043 5.24741 11.0933 5.07733 10.9227C4.90726 10.752 4.6963 10.6667 4.44444 10.6667C4.19259 10.6667 3.98163 10.752 3.81156 10.9227C3.64148 11.0933 3.55615 11.3043 3.55556 11.5556C3.55496 11.8068 3.6403 12.0181 3.81156 12.1893C3.98281 12.3606 4.19378 12.4456 4.44444 12.4444ZM4.44444 8.88889C4.6963 8.88889 4.90756 8.80355 5.07822 8.63289C5.24889 8.46222 5.33393 8.25126 5.33333 8C5.33274 7.74874 5.24741 7.53778 5.07733 7.36711C4.90726 7.19644 4.6963 7.11111 4.44444 7.11111C4.19259 7.11111 3.98163 7.19644 3.81156 7.36711C3.64148 7.53778 3.55615 7.74874 3.55556 8C3.55496 8.25126 3.6403 8.46252 3.81156 8.63378C3.98281 8.80504 4.19378 8.89007 4.44444 8.88889ZM4.44444 5.33333C4.6963 5.33333 4.90756 5.248 5.07822 5.07733C5.24889 4.90667 5.33393 4.6957 5.33333 4.44444C5.33274 4.19318 5.24741 3.98222 5.07733 3.81156C4.90726 3.64089 4.6963 3.55556 4.44444 3.55556C4.19259 3.55556 3.98163 3.64089 3.81156 3.81156C3.64148 3.98222 3.55615 4.19318 3.55556 4.44444C3.55496 4.6957 3.6403 4.90696 3.81156 5.07822C3.98281 5.24948 4.19378 5.33452 4.44444 5.33333ZM8 12.4444H11.5556C11.8074 12.4444 12.0187 12.3591 12.1893 12.1884C12.36 12.0178 12.445 11.8068 12.4444 11.5556C12.4439 11.3043 12.3585 11.0933 12.1884 10.9227C12.0184 10.752 11.8074 10.6667 11.5556 10.6667H8C7.74815 10.6667 7.53718 10.752 7.36711 10.9227C7.19704 11.0933 7.1117 11.3043 7.11111 11.5556C7.11052 11.8068 7.19585 12.0181 7.36711 12.1893C7.53837 12.3606 7.74933 12.4456 8 12.4444ZM8 8.88889H11.5556C11.8074 8.88889 12.0187 8.80355 12.1893 8.63289C12.36 8.46222 12.445 8.25126 12.4444 8C12.4439 7.74874 12.3585 7.53778 12.1884 7.36711C12.0184 7.19644 11.8074 7.11111 11.5556 7.11111H8C7.74815 7.11111 7.53718 7.19644 7.36711 7.36711C7.19704 7.53778 7.1117 7.74874 7.11111 8C7.11052 8.25126 7.19585 8.46252 7.36711 8.63378C7.53837 8.80504 7.74933 8.89007 8 8.88889ZM8 5.33333H11.5556C11.8074 5.33333 12.0187 5.248 12.1893 5.07733C12.36 4.90667 12.445 4.6957 12.4444 4.44444C12.4439 4.19318 12.3585 3.98222 12.1884 3.81156C12.0184 3.64089 11.8074 3.55556 11.5556 3.55556H8C7.74815 3.55556 7.53718 3.64089 7.36711 3.81156C7.19704 3.98222 7.1117 4.19318 7.11111 4.44444C7.11052 4.6957 7.19585 4.90696 7.36711 5.07822C7.53837 5.24948 7.74933 5.33452 8 5.33333ZM1.77778 16C1.28889 16 0.870518 15.8261 0.522667 15.4782C0.174815 15.1304 0.000592593 14.7117 0 14.2222V1.77778C0 1.28889 0.174222 0.870518 0.522667 0.522667C0.871111 0.174815 1.28948 0.000592593 1.77778 0H14.2222C14.7111 0 15.1298 0.174222 15.4782 0.522667C15.8267 0.871111 16.0006 1.28948 16 1.77778V14.2222C16 14.7111 15.8261 15.1298 15.4782 15.4782C15.1304 15.8267 14.7117 16.0006 14.2222 16H1.77778ZM1.77778 14.2222H14.2222V1.77778H1.77778V14.2222Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const InvoiceIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4.36479 11.64L3.8176 12L1.9088 10.7368L0 12V0H11.4528V4.54737C11.052 4.37684 10.5875 4.37684 10.1803 4.56V1.26316H1.27253V9.63789L1.9088 9.22105L3.8176 10.4842L4.36479 10.1053V11.64ZM5.63733 10.7116L9.54401 6.84L10.8356 8.12842L6.93531 12H5.63733V10.7116ZM11.9046 7.06737L11.281 7.68632L9.98303 6.39789L10.6066 5.77895L10.6129 5.77263L10.6193 5.76632C10.7275 5.66526 10.8929 5.65895 11.0138 5.74105C11.0329 5.74737 11.052 5.76632 11.0647 5.77895L11.9046 6.61263C12.0318 6.73895 12.0318 6.94737 11.9046 7.06737ZM8.90774 3.78947V2.52632H2.54507V3.78947H8.90774ZM7.63521 6.31579V5.05263H2.54507V6.31579H7.63521Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const SettingsUserIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clip-path="url(#clip0_212_3041)">
        <path
          d="M9.78694 9.87271C8.89532 9.87271 8.02374 9.60823 7.28248 9.11273C6.54121 8.61724 5.96359 7.913 5.62269 7.08913C5.28178 6.26525 5.19293 5.35877 5.36736 4.48438C5.54179 3.60999 5.97167 2.80699 6.60261 2.17699C7.23354 1.54699 8.03718 1.1183 8.91182 0.94516C9.78647 0.772023 10.6928 0.862222 11.5162 1.20434C12.3396 1.54646 13.0429 2.12513 13.5373 2.86713C14.0317 3.60912 14.2949 4.48109 14.2936 5.37271C14.2901 6.56626 13.8139 7.70981 12.9693 8.55315C12.1247 9.39649 10.9805 9.87095 9.78694 9.87271ZM9.78694 2.19938C9.15931 2.19938 8.54578 2.38549 8.02393 2.73418C7.50208 3.08287 7.09534 3.57848 6.85516 4.15833C6.61498 4.73818 6.55213 5.37623 6.67458 5.9918C6.79702 6.60736 7.09925 7.1728 7.54305 7.6166C7.98685 8.06039 8.55228 8.36263 9.16785 8.48507C9.78342 8.60751 10.4215 8.54467 11.0013 8.30449C11.5812 8.06431 12.0768 7.65757 12.4255 7.13572C12.7742 6.61387 12.9603 6.00034 12.9603 5.37271C12.9603 4.53109 12.6259 3.72394 12.0308 3.12883C11.4357 2.53371 10.6286 2.19938 9.78694 2.19938Z"
          fill="currentColor"
        />
        <path
          d="M10.9463 21.1228C10.8006 20.977 10.6882 20.8014 10.6169 20.6081C10.5455 20.4148 10.5169 20.2082 10.533 20.0028H2.66634V16.1494C3.61135 15.1405 4.75784 14.3413 6.03149 13.8039C7.30514 13.2664 8.67752 13.0025 10.0597 13.0294H10.5397C10.5091 12.8059 10.5304 12.5784 10.6021 12.3645C10.6738 12.1505 10.7939 11.9561 10.953 11.7961L11.033 11.7228C10.7197 11.7228 10.3663 11.6828 10.0597 11.6828C8.43328 11.6442 6.81862 11.9674 5.33246 12.6292C3.84629 13.291 2.52576 14.2748 1.46634 15.5094C1.37979 15.6248 1.33301 15.7652 1.33301 15.9094V20.0028C1.33301 20.3564 1.47348 20.6955 1.72353 20.9456C1.97358 21.1956 2.31272 21.3361 2.66634 21.3361H11.133L10.9463 21.1228Z"
          fill="currentColor"
        />
        <path
          d="M22.4532 15.5489L21.1198 15.1423C21.0246 14.8161 20.895 14.501 20.7332 14.2023L21.3998 12.9623C21.4215 12.9127 21.4268 12.8574 21.4148 12.8046C21.4028 12.7518 21.3742 12.7043 21.3332 12.6689L20.3665 11.7023C20.33 11.6627 20.2811 11.6366 20.2279 11.6281C20.1747 11.6196 20.1202 11.6293 20.0732 11.6556L18.8465 12.3223C18.5448 12.1517 18.2251 12.0153 17.8932 11.9156L17.4865 10.5823C17.4693 10.5332 17.4365 10.491 17.3932 10.4622C17.3499 10.4333 17.2985 10.4193 17.2465 10.4223H15.8798C15.8273 10.4217 15.7761 10.4383 15.734 10.4696C15.6918 10.5009 15.6611 10.5452 15.6465 10.5956L15.2398 11.9289C14.9059 12.0261 14.5839 12.1602 14.2798 12.3289L13.0665 11.6623C13.0205 11.6365 12.9671 11.6271 12.915 11.6356C12.863 11.644 12.8153 11.6699 12.7798 11.7089L11.7932 12.6689C11.7566 12.7075 11.7331 12.7565 11.7259 12.8091C11.7187 12.8618 11.7282 12.9153 11.7532 12.9623L12.4198 14.1756C12.2437 14.4762 12.1027 14.7961 11.9998 15.1289L10.6665 15.5289C10.6161 15.5435 10.5718 15.5742 10.5405 15.6164C10.5092 15.6585 10.4926 15.7098 10.4932 15.7623V17.1289C10.4971 17.1771 10.5159 17.2228 10.547 17.2598C10.578 17.2969 10.6198 17.3233 10.6665 17.3356L11.9998 17.7423C12.0984 18.0693 12.2325 18.3845 12.3998 18.6823L11.7332 19.9556C11.7077 20.0012 11.6979 20.0539 11.7051 20.1056C11.7123 20.1574 11.7362 20.2053 11.7732 20.2423L12.7398 21.2089C12.7776 21.2466 12.8263 21.2714 12.879 21.2798C12.9316 21.2881 12.9856 21.2797 13.0332 21.2556L14.2798 20.5889C14.5763 20.7489 14.8893 20.8763 15.2132 20.9689L15.6132 22.3023C15.6296 22.3516 15.6608 22.3947 15.7025 22.4257C15.7443 22.4567 15.7945 22.4741 15.8465 22.4756H17.2132C17.2654 22.4751 17.3162 22.4581 17.3581 22.4269C17.4 22.3958 17.431 22.3521 17.4465 22.3023L17.8532 20.9356C18.1725 20.8421 18.4809 20.7147 18.7732 20.5556L20.0332 21.2223C20.0795 21.2469 20.1326 21.2556 20.1844 21.2472C20.2361 21.2388 20.2837 21.2136 20.3198 21.1756L21.3332 20.2689C21.3604 20.2298 21.375 20.1833 21.375 20.1356C21.375 20.0879 21.3604 20.0414 21.3332 20.0023L20.6665 18.7489C20.8284 18.4548 20.958 18.1442 21.0532 17.8223L22.3865 17.4156C22.437 17.401 22.4812 17.3703 22.5125 17.3282C22.5438 17.286 22.5605 17.2348 22.5598 17.1823V15.7823C22.566 15.7373 22.5592 15.6914 22.5403 15.6501C22.5214 15.6088 22.4912 15.5737 22.4532 15.5489ZM16.5665 18.6689C16.1256 18.6702 15.6941 18.5406 15.3269 18.2964C14.9597 18.0523 14.6733 17.7046 14.504 17.2975C14.3346 16.8903 14.2899 16.4421 14.3757 16.0095C14.4614 15.577 14.6736 15.1796 14.9854 14.8678C15.2972 14.556 15.6945 14.3438 16.1271 14.2581C16.5596 14.1724 17.0079 14.217 17.415 14.3864C17.8222 14.5557 18.1699 14.8422 18.414 15.2094C18.6582 15.5765 18.7878 16.008 18.7865 16.4489C18.7848 17.0372 18.5503 17.6008 18.1343 18.0168C17.7184 18.4327 17.1548 18.6672 16.5665 18.6689Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_212_3041">
          <rect width="24" height="24" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};
export const SettingsUserIcon2 = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15.0002 21H21.0002V20.175C20.5835 19.7917 20.1169 19.5 19.6002 19.3C19.0835 19.1 18.5502 19 18.0002 19C17.4502 19 16.9169 19.1 16.4002 19.3C15.8835 19.5 15.4169 19.7917 15.0002 20.175V21ZM18.0002 18C18.4169 18 18.7712 17.8543 19.0632 17.563C19.3552 17.2717 19.5009 16.9173 19.5002 16.5C19.4995 16.0827 19.3539 15.7287 19.0632 15.438C18.7725 15.1473 18.4182 15.0013 18.0002 15C17.5822 14.9987 17.2282 15.1447 16.9382 15.438C16.6482 15.7313 16.5022 16.0853 16.5002 16.5C16.4982 16.9147 16.6442 17.269 16.9382 17.563C17.2322 17.857 17.5862 18.0027 18.0002 18ZM12.0502 8.5C11.0835 8.5 10.2585 8.84167 9.5752 9.525C8.89186 10.2083 8.5502 11.0333 8.5502 12C8.5502 12.8 8.7752 13.5 9.2252 14.1C9.6752 14.7 10.2669 15.1167 11.0002 15.35C11.0002 14.9667 11.0045 14.6 11.0132 14.25C11.0219 13.9 11.0925 13.5833 11.2252 13.3C10.9919 13.1667 10.8212 12.9833 10.7132 12.75C10.6052 12.5167 10.5509 12.2667 10.5502 12C10.5502 11.5833 10.6962 11.2293 10.9882 10.938C11.2802 10.6467 11.6342 10.5007 12.0502 10.5C12.3002 10.5 12.5379 10.5627 12.7632 10.688C12.9885 10.8133 13.1759 10.984 13.3252 11.2C13.5085 11.1167 13.7002 11.0583 13.9002 11.025C14.1002 10.9917 14.3002 10.975 14.5002 10.975H15.4002C15.1835 10.2583 14.7712 9.66667 14.1632 9.2C13.5552 8.73333 12.8509 8.5 12.0502 8.5ZM9.2502 22L8.8502 18.8C8.63353 18.7167 8.42953 18.6167 8.2382 18.5C8.04686 18.3833 7.8592 18.2583 7.6752 18.125L4.7002 19.375L1.9502 14.625L4.5252 12.675C4.50853 12.5583 4.5002 12.446 4.5002 12.338V11.663C4.5002 11.5543 4.50853 11.4417 4.5252 11.325L1.9502 9.375L4.7002 4.625L7.6752 5.875C7.85853 5.74167 8.0502 5.61667 8.2502 5.5C8.4502 5.38333 8.6502 5.28333 8.8502 5.2L9.2502 2H14.7502L15.1502 5.2C15.3669 5.28333 15.5712 5.38333 15.7632 5.5C15.9552 5.61667 16.1425 5.74167 16.3252 5.875L19.3002 4.625L22.0502 9.375L19.9252 11H17.4002C17.3835 10.9167 17.3669 10.8293 17.3502 10.738C17.3335 10.6467 17.3085 10.559 17.2752 10.475L19.4252 8.85L18.4502 7.15L15.9752 8.2C15.6085 7.81667 15.2042 7.496 14.7622 7.238C14.3202 6.98 13.8412 6.784 13.3252 6.65L13.0002 4H11.0252L10.6752 6.65C10.1585 6.78333 9.67953 6.97933 9.2382 7.238C8.79686 7.49667 8.39253 7.809 8.0252 8.175L5.5502 7.15L4.5752 8.85L6.72519 10.45C6.64186 10.7 6.58353 10.95 6.5502 11.2C6.51686 11.45 6.5002 11.7167 6.5002 12C6.5002 12.2667 6.51686 12.525 6.5502 12.775C6.58353 13.025 6.64186 13.275 6.72519 13.525L4.5752 15.15L5.5502 16.85L8.0252 15.8C8.4252 16.2167 8.8752 16.5667 9.3752 16.85C9.8752 17.1333 10.4169 17.3167 11.0002 17.4V22H9.2502ZM14.5002 23C14.0835 23 13.7295 22.8543 13.4382 22.563C13.1469 22.2717 13.0009 21.9173 13.0002 21.5V14.5C13.0002 14.0833 13.1462 13.7293 13.4382 13.438C13.7302 13.1467 14.0842 13.0007 14.5002 13H21.5002C21.9169 13 22.2712 13.146 22.5632 13.438C22.8552 13.73 23.0009 14.084 23.0002 14.5V21.5C23.0002 21.9167 22.8545 22.271 22.5632 22.563C22.2719 22.855 21.9175 23.0007 21.5002 23H14.5002Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const MediaFilesIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M5 8C5 5.17157 5 3.75736 5.87868 2.87868C6.75736 2 8.17157 2 11 2H13C15.8284 2 17.2426 2 18.1213 2.87868C19 3.75736 19 5.17157 19 8V16C19 18.8284 19 20.2426 18.1213 21.1213C17.2426 22 15.8284 22 13 22H11C8.17157 22 6.75736 22 5.87868 21.1213C5 20.2426 5 18.8284 5 16V8Z"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          d="M19 19.5C19.4645 19.5 19.6968 19.5 19.8911 19.4692C20.9608 19.2998 21.7998 18.4608 21.9692 17.3911C22 17.1968 22 16.9645 22 16.5V7.5C22 7.0355 22 6.80325 21.9692 6.60891C21.7998 5.53918 20.9608 4.70021 19.8911 4.53078C19.6968 4.5 19.4645 4.5 19 4.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path d="M13 14V11V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="11" cy="14" r="2" stroke="currentColor" stroke-width="1.5" />
        <path
          d="M15 10C13.8954 10 13 9.10457 13 8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M5 19.5C4.5355 19.5 4.30325 19.5 4.10891 19.4692C3.03918 19.2998 2.20021 18.4608 2.03078 17.3911C2 17.1968 2 16.9645 2 16.5V7.5C2 7.0355 2 6.80325 2.03078 6.60891C2.20021 5.53918 3.03918 4.70021 4.10891 4.53078C4.30325 4.5 4.5355 4.5 5 4.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
      </g>
    </svg>
  );
};

export const NotesViewIcon = ({ className }: IconProps) => {
  return (
    <svg
      data-v-15b35c9e=""
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className={className}
    >
      <path d="M8 2v4"></path>
      <path d="M12 2v4"></path>
      <path d="M16 2v4"></path>
      <rect width="16" height="18" x="4" y="4" rx="2"></rect>
      <path d="M8 10h6"></path>
      <path d="M8 14h8"></path>
      <path d="M8 18h5"></path>
    </svg>
  );
};
export const CategoryIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="none" d="M0 0h24v24H0V0z"></path>
      <path d="m12 2-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z"></path>
    </svg>
  );
};

export const DescriptionIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      className={className}
      stroke-width="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7"></path>
    </svg>
  );
};
export const OutgoingCallStrokeIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M15 9L19 5M19 5V8M19 5H16"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M15.1007 15.0272L14.5569 14.5107L15.1007 15.0272ZM15.5562 14.5477L16.1 15.0642H16.1L15.5562 14.5477ZM17.9728 14.2123L17.5987 14.8623H17.5987L17.9728 14.2123ZM19.8833 15.312L19.5092 15.962L19.8833 15.312ZM20.4217 18.7584L20.9655 19.2749L20.4217 18.7584ZM19.0011 20.254L18.4573 19.7375L19.0011 20.254ZM17.6763 20.9631L17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587L7.81536 16.4752ZM3.00289 6.96594L2.25397 7.00613L2.25397 7.00613L3.00289 6.96594ZM9.47752 8.50311L10.0213 9.01963H10.0213L9.47752 8.50311ZM9.63424 5.6931L10.2466 5.26012L9.63424 5.6931ZM8.37326 3.90961L7.76086 4.3426V4.3426L8.37326 3.90961ZM5.26145 3.60864L5.80524 4.12516L5.26145 3.60864ZM3.69185 5.26114L3.14806 4.74462L3.14806 4.74462L3.69185 5.26114ZM11.0631 13.0559L11.6069 12.5394L11.0631 13.0559ZM15.1007 15.0272L15.6445 15.5437L16.1 15.0642L15.5562 14.5477L15.0124 14.0312L14.5569 14.5107L15.1007 15.0272ZM17.9728 14.2123L17.5987 14.8623L19.5092 15.962L19.8833 15.312L20.2575 14.662L18.347 13.5623L17.9728 14.2123ZM20.4217 18.7584L19.8779 18.2419L18.4573 19.7375L19.0011 20.254L19.5449 20.7705L20.9655 19.2749L20.4217 18.7584ZM17.6763 20.9631L17.6026 20.2167C16.1676 20.3584 12.4233 20.2375 8.35915 15.9587L7.81536 16.4752L7.27157 16.9917C11.7009 21.655 15.9261 21.8895 17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587C4.48303 11.8778 3.83285 8.43556 3.75181 6.92574L3.00289 6.96594L2.25397 7.00613C2.35322 8.85536 3.1384 12.6403 7.27157 16.9917L7.81536 16.4752ZM9.1907 8.80507L9.7345 9.32159L10.0213 9.01963L9.47752 8.50311L8.93372 7.9866L8.64691 8.28856L9.1907 8.80507ZM9.63424 5.6931L10.2466 5.26012L8.98565 3.47663L8.37326 3.90961L7.76086 4.3426L9.02185 6.12608L9.63424 5.6931ZM5.26145 3.60864L4.71766 3.09213L3.14806 4.74462L3.69185 5.26114L4.23564 5.77765L5.80524 4.12516L5.26145 3.60864ZM9.1907 8.80507C8.64691 8.28856 8.64622 8.28929 8.64552 8.29002C8.64528 8.29028 8.64458 8.29102 8.64411 8.29152C8.64316 8.29254 8.64219 8.29357 8.64121 8.29463C8.63924 8.29675 8.6372 8.29896 8.6351 8.30127C8.63091 8.30588 8.62646 8.31087 8.62178 8.31625C8.61243 8.32701 8.60215 8.33931 8.59116 8.3532C8.56918 8.38098 8.54431 8.41512 8.51822 8.45588C8.46591 8.53764 8.40917 8.64531 8.36112 8.78033C8.26342 9.0549 8.21018 9.4185 8.27671 9.87257C8.40742 10.7647 8.99198 11.9644 10.5193 13.5724L11.0631 13.0559L11.6069 12.5394C10.1793 11.0363 9.82761 10.1106 9.76086 9.65511C9.72866 9.43536 9.76138 9.31957 9.77432 9.28321C9.78159 9.26277 9.78635 9.25709 9.78169 9.26437C9.77944 9.26789 9.77494 9.27451 9.76738 9.28407C9.76359 9.28885 9.75904 9.29437 9.7536 9.30063C9.75088 9.30375 9.74793 9.30706 9.74476 9.31056C9.74317 9.31231 9.74152 9.3141 9.73981 9.31594C9.73896 9.31686 9.73809 9.31779 9.7372 9.31873C9.73676 9.3192 9.73608 9.31992 9.73586 9.32015C9.73518 9.32087 9.7345 9.32159 9.1907 8.80507ZM11.0631 13.0559L10.5193 13.5724C12.0422 15.1757 13.1923 15.806 14.0698 15.9485C14.5201 16.0216 14.8846 15.9632 15.1606 15.8544C15.2955 15.8012 15.4022 15.7387 15.4823 15.6819C15.5223 15.6535 15.5556 15.6266 15.5824 15.6031C15.5959 15.5913 15.6077 15.5803 15.618 15.5703C15.6232 15.5654 15.628 15.5606 15.6324 15.5562C15.6346 15.554 15.6367 15.5518 15.6387 15.5497C15.6397 15.5487 15.6407 15.5477 15.6417 15.5467C15.6422 15.5462 15.6429 15.5454 15.6431 15.5452C15.6438 15.5444 15.6445 15.5437 15.1007 15.0272C14.5569 14.5107 14.5576 14.51 14.5583 14.5093C14.5585 14.509 14.5592 14.5083 14.5596 14.5078C14.5605 14.5069 14.5614 14.506 14.5623 14.5051C14.5641 14.5033 14.5658 14.5015 14.5674 14.4998C14.5708 14.4965 14.574 14.4933 14.577 14.4904C14.583 14.4846 14.5885 14.4796 14.5933 14.4754C14.6028 14.467 14.6099 14.4616 14.6145 14.4584C14.6239 14.4517 14.6229 14.454 14.6102 14.459C14.5909 14.4666 14.5 14.4987 14.3103 14.4679C13.9077 14.4025 13.0391 14.0472 11.6069 12.5394L11.0631 13.0559ZM8.37326 3.90961L8.98565 3.47663C7.97206 2.04305 5.94384 1.80119 4.71766 3.09213L5.26145 3.60864L5.80524 4.12516C6.32808 3.57471 7.24851 3.61795 7.76086 4.3426L8.37326 3.90961ZM3.00289 6.96594L3.75181 6.92574C3.73038 6.52644 3.90425 6.12654 4.23564 5.77765L3.69185 5.26114L3.14806 4.74462C2.61221 5.30877 2.20493 6.09246 2.25397 7.00613L3.00289 6.96594ZM19.0011 20.254L18.4573 19.7375C18.1783 20.0313 17.8864 20.1887 17.6026 20.2167L17.6763 20.9631L17.7499 21.7095C18.497 21.6357 19.1016 21.2373 19.5449 20.7705L19.0011 20.254ZM9.47752 8.50311L10.0213 9.01963C10.9889 8.00095 11.0574 6.40678 10.2466 5.26012L9.63424 5.6931L9.02185 6.12608C9.44399 6.72315 9.37926 7.51753 8.93372 7.9866L9.47752 8.50311ZM19.8833 15.312L19.5092 15.962C20.33 16.4345 20.4907 17.5968 19.8779 18.2419L20.4217 18.7584L20.9655 19.2749C22.2704 17.901 21.8904 15.6019 20.2575 14.662L19.8833 15.312ZM15.5562 14.5477L16.1 15.0642C16.4854 14.6584 17.086 14.5672 17.5987 14.8623L17.9728 14.2123L18.347 13.5623C17.2485 12.93 15.8861 13.1113 15.0124 14.0312L15.5562 14.5477Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const IncomingCallStrokeIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M19 5L15 9M15 9V6M15 9H18"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M15.1007 15.0272L14.5569 14.5107L15.1007 15.0272ZM15.5562 14.5477L16.1 15.0642H16.1L15.5562 14.5477ZM17.9728 14.2123L17.5987 14.8623H17.5987L17.9728 14.2123ZM19.8833 15.312L19.5092 15.962L19.8833 15.312ZM20.4217 18.7584L20.9655 19.2749L20.4217 18.7584ZM19.0011 20.254L18.4573 19.7375L19.0011 20.254ZM17.6763 20.9631L17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587L7.81536 16.4752ZM3.00289 6.96594L2.25397 7.00613L2.25397 7.00613L3.00289 6.96594ZM9.47752 8.50311L10.0213 9.01963H10.0213L9.47752 8.50311ZM9.63424 5.6931L10.2466 5.26012L9.63424 5.6931ZM8.37326 3.90961L7.76086 4.3426V4.3426L8.37326 3.90961ZM5.26145 3.60864L5.80524 4.12516L5.26145 3.60864ZM3.69185 5.26114L3.14806 4.74462L3.14806 4.74462L3.69185 5.26114ZM11.0631 13.0559L11.6069 12.5394L11.0631 13.0559ZM15.1007 15.0272L15.6445 15.5437L16.1 15.0642L15.5562 14.5477L15.0124 14.0312L14.5569 14.5107L15.1007 15.0272ZM17.9728 14.2123L17.5987 14.8623L19.5092 15.962L19.8833 15.312L20.2575 14.662L18.347 13.5623L17.9728 14.2123ZM20.4217 18.7584L19.8779 18.2419L18.4573 19.7375L19.0011 20.254L19.5449 20.7705L20.9655 19.2749L20.4217 18.7584ZM17.6763 20.9631L17.6026 20.2167C16.1676 20.3584 12.4233 20.2375 8.35915 15.9587L7.81536 16.4752L7.27157 16.9917C11.7009 21.655 15.9261 21.8895 17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587C4.48303 11.8778 3.83285 8.43556 3.75181 6.92574L3.00289 6.96594L2.25397 7.00613C2.35322 8.85536 3.1384 12.6403 7.27157 16.9917L7.81536 16.4752ZM9.1907 8.80507L9.7345 9.32159L10.0213 9.01963L9.47752 8.50311L8.93372 7.9866L8.64691 8.28856L9.1907 8.80507ZM9.63424 5.6931L10.2466 5.26012L8.98565 3.47663L8.37326 3.90961L7.76086 4.3426L9.02185 6.12608L9.63424 5.6931ZM5.26145 3.60864L4.71766 3.09213L3.14806 4.74462L3.69185 5.26114L4.23564 5.77765L5.80524 4.12516L5.26145 3.60864ZM9.1907 8.80507C8.64691 8.28856 8.64622 8.28929 8.64552 8.29002C8.64528 8.29028 8.64458 8.29102 8.64411 8.29152C8.64316 8.29254 8.64219 8.29357 8.64121 8.29463C8.63924 8.29675 8.6372 8.29896 8.6351 8.30127C8.63091 8.30588 8.62646 8.31087 8.62178 8.31625C8.61243 8.32701 8.60215 8.33931 8.59116 8.3532C8.56918 8.38098 8.54431 8.41512 8.51822 8.45588C8.46591 8.53764 8.40917 8.64531 8.36112 8.78033C8.26342 9.0549 8.21018 9.4185 8.27671 9.87257C8.40742 10.7647 8.99198 11.9644 10.5193 13.5724L11.0631 13.0559L11.6069 12.5394C10.1793 11.0363 9.82761 10.1106 9.76086 9.65511C9.72866 9.43536 9.76138 9.31957 9.77432 9.28321C9.78159 9.26277 9.78635 9.25709 9.78169 9.26437C9.77944 9.26789 9.77494 9.27451 9.76738 9.28407C9.76359 9.28885 9.75904 9.29437 9.7536 9.30063C9.75088 9.30375 9.74793 9.30706 9.74476 9.31056C9.74317 9.31231 9.74152 9.3141 9.73981 9.31594C9.73896 9.31686 9.73809 9.31779 9.7372 9.31873C9.73676 9.3192 9.73608 9.31992 9.73586 9.32015C9.73518 9.32087 9.7345 9.32159 9.1907 8.80507ZM11.0631 13.0559L10.5193 13.5724C12.0422 15.1757 13.1923 15.806 14.0698 15.9485C14.5201 16.0216 14.8846 15.9632 15.1606 15.8544C15.2955 15.8012 15.4022 15.7387 15.4823 15.6819C15.5223 15.6535 15.5556 15.6266 15.5824 15.6031C15.5959 15.5913 15.6077 15.5803 15.618 15.5703C15.6232 15.5654 15.628 15.5606 15.6324 15.5562C15.6346 15.554 15.6367 15.5518 15.6387 15.5497C15.6397 15.5487 15.6407 15.5477 15.6417 15.5467C15.6422 15.5462 15.6429 15.5454 15.6431 15.5452C15.6438 15.5444 15.6445 15.5437 15.1007 15.0272C14.5569 14.5107 14.5576 14.51 14.5583 14.5093C14.5585 14.509 14.5592 14.5083 14.5596 14.5078C14.5605 14.5069 14.5614 14.506 14.5623 14.5051C14.5641 14.5033 14.5658 14.5015 14.5674 14.4998C14.5708 14.4965 14.574 14.4933 14.577 14.4904C14.583 14.4846 14.5885 14.4796 14.5933 14.4754C14.6028 14.467 14.6099 14.4616 14.6145 14.4584C14.6239 14.4517 14.6229 14.454 14.6102 14.459C14.5909 14.4666 14.5 14.4987 14.3103 14.4679C13.9077 14.4025 13.0391 14.0472 11.6069 12.5394L11.0631 13.0559ZM8.37326 3.90961L8.98565 3.47663C7.97206 2.04305 5.94384 1.80119 4.71766 3.09213L5.26145 3.60864L5.80524 4.12516C6.32808 3.57471 7.24851 3.61795 7.76086 4.3426L8.37326 3.90961ZM3.00289 6.96594L3.75181 6.92574C3.73038 6.52644 3.90425 6.12654 4.23564 5.77765L3.69185 5.26114L3.14806 4.74462C2.61221 5.30877 2.20493 6.09246 2.25397 7.00613L3.00289 6.96594ZM19.0011 20.254L18.4573 19.7375C18.1783 20.0313 17.8864 20.1887 17.6026 20.2167L17.6763 20.9631L17.7499 21.7095C18.497 21.6357 19.1016 21.2373 19.5449 20.7705L19.0011 20.254ZM9.47752 8.50311L10.0213 9.01963C10.9889 8.00095 11.0574 6.40678 10.2466 5.26012L9.63424 5.6931L9.02185 6.12608C9.44399 6.72315 9.37926 7.51753 8.93372 7.9866L9.47752 8.50311ZM19.8833 15.312L19.5092 15.962C20.33 16.4345 20.4907 17.5968 19.8779 18.2419L20.4217 18.7584L20.9655 19.2749C22.2704 17.901 21.8904 15.6019 20.2575 14.662L19.8833 15.312ZM15.5562 14.5477L16.1 15.0642C16.4854 14.6584 17.086 14.5672 17.5987 14.8623L17.9728 14.2123L18.347 13.5623C17.2485 12.93 15.8861 13.1113 15.0124 14.0312L15.5562 14.5477Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
export const MissedCallStrokeIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g opacity="0.9">
        <path
          d="M20 4.00002L16 8M16 4L20 7.99998"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M15.1007 15.0272L14.5569 14.5107L15.1007 15.0272ZM15.5562 14.5477L16.1 15.0642H16.1L15.5562 14.5477ZM17.9728 14.2123L17.5987 14.8623H17.5987L17.9728 14.2123ZM19.8833 15.312L19.5092 15.962L19.8833 15.312ZM20.4217 18.7584L20.9655 19.2749L20.4217 18.7584ZM19.0011 20.254L18.4573 19.7375L19.0011 20.254ZM17.6763 20.9631L17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587L7.81536 16.4752ZM3.00289 6.96594L2.25397 7.00613L2.25397 7.00613L3.00289 6.96594ZM9.47752 8.50311L10.0213 9.01963H10.0213L9.47752 8.50311ZM9.63424 5.6931L10.2466 5.26012L9.63424 5.6931ZM8.37326 3.90961L7.76086 4.3426V4.3426L8.37326 3.90961ZM5.26145 3.60864L5.80524 4.12516L5.26145 3.60864ZM3.69185 5.26114L3.14806 4.74462L3.14806 4.74462L3.69185 5.26114ZM11.0631 13.0559L11.6069 12.5394L11.0631 13.0559ZM15.1007 15.0272L15.6445 15.5437L16.1 15.0642L15.5562 14.5477L15.0124 14.0312L14.5569 14.5107L15.1007 15.0272ZM17.9728 14.2123L17.5987 14.8623L19.5092 15.962L19.8833 15.312L20.2575 14.662L18.347 13.5623L17.9728 14.2123ZM20.4217 18.7584L19.8779 18.2419L18.4573 19.7375L19.0011 20.254L19.5449 20.7705L20.9655 19.2749L20.4217 18.7584ZM17.6763 20.9631L17.6026 20.2167C16.1676 20.3584 12.4233 20.2375 8.35915 15.9587L7.81536 16.4752L7.27157 16.9917C11.7009 21.655 15.9261 21.8895 17.7499 21.7095L17.6763 20.9631ZM7.81536 16.4752L8.35915 15.9587C4.48303 11.8778 3.83285 8.43556 3.75181 6.92574L3.00289 6.96594L2.25397 7.00613C2.35322 8.85536 3.1384 12.6403 7.27157 16.9917L7.81536 16.4752ZM9.1907 8.80507L9.7345 9.32159L10.0213 9.01963L9.47752 8.50311L8.93372 7.9866L8.64691 8.28856L9.1907 8.80507ZM9.63424 5.6931L10.2466 5.26012L8.98565 3.47663L8.37326 3.90961L7.76086 4.3426L9.02185 6.12608L9.63424 5.6931ZM5.26145 3.60864L4.71766 3.09213L3.14806 4.74462L3.69185 5.26114L4.23564 5.77765L5.80524 4.12516L5.26145 3.60864ZM9.1907 8.80507C8.64691 8.28856 8.64622 8.28929 8.64552 8.29002C8.64528 8.29028 8.64458 8.29102 8.64411 8.29152C8.64316 8.29254 8.64219 8.29357 8.64121 8.29463C8.63924 8.29675 8.6372 8.29896 8.6351 8.30127C8.63091 8.30588 8.62646 8.31087 8.62178 8.31625C8.61243 8.32701 8.60215 8.33931 8.59116 8.3532C8.56918 8.38098 8.54431 8.41512 8.51822 8.45588C8.46591 8.53764 8.40917 8.64531 8.36112 8.78033C8.26342 9.0549 8.21018 9.4185 8.27671 9.87257C8.40742 10.7647 8.99198 11.9644 10.5193 13.5724L11.0631 13.0559L11.6069 12.5394C10.1793 11.0363 9.82761 10.1106 9.76086 9.65511C9.72866 9.43536 9.76138 9.31957 9.77432 9.28321C9.78159 9.26277 9.78635 9.25709 9.78169 9.26437C9.77944 9.26789 9.77494 9.27451 9.76738 9.28407C9.76359 9.28885 9.75904 9.29437 9.7536 9.30063C9.75088 9.30375 9.74793 9.30706 9.74476 9.31056C9.74317 9.31231 9.74152 9.3141 9.73981 9.31594C9.73896 9.31686 9.73809 9.31779 9.7372 9.31873C9.73676 9.3192 9.73608 9.31992 9.73586 9.32015C9.73518 9.32087 9.7345 9.32159 9.1907 8.80507ZM11.0631 13.0559L10.5193 13.5724C12.0422 15.1757 13.1923 15.806 14.0698 15.9485C14.5201 16.0216 14.8846 15.9632 15.1606 15.8544C15.2955 15.8012 15.4022 15.7387 15.4823 15.6819C15.5223 15.6535 15.5556 15.6266 15.5824 15.6031C15.5959 15.5913 15.6077 15.5803 15.618 15.5703C15.6232 15.5654 15.628 15.5606 15.6324 15.5562C15.6346 15.554 15.6367 15.5518 15.6387 15.5497C15.6397 15.5487 15.6407 15.5477 15.6417 15.5467C15.6422 15.5462 15.6429 15.5454 15.6431 15.5452C15.6438 15.5444 15.6445 15.5437 15.1007 15.0272C14.5569 14.5107 14.5576 14.51 14.5583 14.5093C14.5585 14.509 14.5592 14.5083 14.5596 14.5078C14.5605 14.5069 14.5614 14.506 14.5623 14.5051C14.5641 14.5033 14.5658 14.5015 14.5674 14.4998C14.5708 14.4965 14.574 14.4933 14.577 14.4904C14.583 14.4846 14.5885 14.4796 14.5933 14.4754C14.6028 14.467 14.6099 14.4616 14.6145 14.4584C14.6239 14.4517 14.6229 14.454 14.6102 14.459C14.5909 14.4666 14.5 14.4987 14.3103 14.4679C13.9077 14.4025 13.0391 14.0472 11.6069 12.5394L11.0631 13.0559ZM8.37326 3.90961L8.98565 3.47663C7.97206 2.04305 5.94384 1.80119 4.71766 3.09213L5.26145 3.60864L5.80524 4.12516C6.32808 3.57471 7.24851 3.61795 7.76086 4.3426L8.37326 3.90961ZM3.00289 6.96594L3.75181 6.92574C3.73038 6.52644 3.90425 6.12654 4.23564 5.77765L3.69185 5.26114L3.14806 4.74462C2.61221 5.30877 2.20493 6.09246 2.25397 7.00613L3.00289 6.96594ZM19.0011 20.254L18.4573 19.7375C18.1783 20.0313 17.8864 20.1887 17.6026 20.2167L17.6763 20.9631L17.7499 21.7095C18.497 21.6357 19.1016 21.2373 19.5449 20.7705L19.0011 20.254ZM9.47752 8.50311L10.0213 9.01963C10.9889 8.00095 11.0574 6.40678 10.2466 5.26012L9.63424 5.6931L9.02185 6.12608C9.44399 6.72315 9.37926 7.51753 8.93372 7.9866L9.47752 8.50311ZM19.8833 15.312L19.5092 15.962C20.33 16.4345 20.4907 17.5968 19.8779 18.2419L20.4217 18.7584L20.9655 19.2749C22.2704 17.901 21.8904 15.6019 20.2575 14.662L19.8833 15.312ZM15.5562 14.5477L16.1 15.0642C16.4854 14.6584 17.086 14.5672 17.5987 14.8623L17.9728 14.2123L18.347 13.5623C17.2485 12.93 15.8861 13.1113 15.0124 14.0312L15.5562 14.5477Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};

export const CallBackReschuledStrokeIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        d="M11 1H5a1 1 0 0 0-1 1v6a.5.5 0 0 1-1 0V2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a.5.5 0 0 1-1 0V2a1 1 0 0 0-1-1m1 13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a.5.5 0 0 0-1 0v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2a.5.5 0 0 0-1 0zM1.713 7.954a.5.5 0 1 0-.419-.908c-.347.16-.654.348-.882.57C.184 7.842 0 8.139 0 8.5c0 .546.408.94.823 1.201.44.278 1.043.51 1.745.696C3.978 10.773 5.898 11 8 11q.148 0 .294-.002l-1.148 1.148a.5.5 0 0 0 .708.708l2-2a.5.5 0 0 0 0-.708l-2-2a.5.5 0 1 0-.708.708l1.145 1.144L8 10c-2.04 0-3.87-.221-5.174-.569-.656-.175-1.151-.374-1.47-.575C1.012 8.639 1 8.506 1 8.5c0-.003 0-.059.112-.17.115-.112.31-.242.6-.376Zm12.993-.908a.5.5 0 0 0-.419.908c.292.134.486.264.6.377.113.11.113.166.113.169s0 .065-.13.187c-.132.122-.352.26-.677.4-.645.28-1.596.523-2.763.687a.5.5 0 0 0 .14.99c1.212-.17 2.26-.43 3.02-.758.38-.164.713-.357.96-.587.246-.229.45-.537.45-.919 0-.362-.184-.66-.412-.883s-.535-.411-.882-.571M7.5 2a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1z"
      ></path>
    </svg>
  );
};
export const FileBlankIcon = ({ className }: IconProps) => {
  return (
    <svg
      width="26"
      height="25"
      viewBox="0 0 26 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M15.98 4.5H5.97998V20.5H19.98V8.5H15.98V4.5ZM3.97998 3.5C3.97998 3.22 4.07665 2.98333 4.26998 2.79C4.46331 2.59667 4.69998 2.5 4.97998 2.5H16.98L21.98 7.5V21.5C21.98 21.7667 21.8833 22 21.69 22.2C21.4966 22.4 21.26 22.5 20.98 22.5H4.97998C4.69998 22.5 4.46331 22.4033 4.26998 22.21C4.07665 22.0167 3.97998 21.78 3.97998 21.5V3.5ZM11.98 11.5V8.5H13.98V11.5H16.98V13.5H13.98V16.5H11.98V13.5H8.97998V11.5H11.98Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const CampaignLogsIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      className={className}
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="none" d="M0 0h24v24H0z"></path>
      <path d="M18 11v2h4v-2h-4zM16 17.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm5.03 1.71L11 9.53v4.94l-1.97-1.18-.48-.29H4v-2h4.55l.48-.29zM15.5 12c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"></path>
    </svg>
  );
};
export const UndoIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="none"
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.33929 4.46777H7.33929V7.02487C8.52931 6.08978 10.0299 5.53207 11.6607 5.53207C15.5267 5.53207 18.6607 8.66608 18.6607 12.5321C18.6607 16.3981 15.5267 19.5321 11.6607 19.5321C9.51025 19.5321 7.58625 18.5623 6.30219 17.0363L7.92151 15.8515C8.83741 16.8825 10.1732 17.5321 11.6607 17.5321C14.4222 17.5321 16.6607 15.2935 16.6607 12.5321C16.6607 9.77065 14.4222 7.53207 11.6607 7.53207C10.5739 7.53207 9.56805 7.87884 8.74779 8.46777L11.3393 8.46777V10.4678H5.33929V4.46777Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

export const FeedbackIconLine = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6.45455 19L2 22.5V4C2 3.44772 2.44772 3 3 3H21C21.5523 3 22 3.44772 22 4V18C22 18.5523 21.5523 19 21 19H6.45455ZM4 18.3851L5.76282 17H20V5H4V18.3851ZM11 13H13V15H11V13ZM11 7H13V12H11V7Z"></path>
    </svg>
  );
};
export const InvitedIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      stroke-width="0"
      version="1"
      viewBox="0 0 48 48"
      enable-background="new 0 0 48 48"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#78909C"
        d="M40,41H8c-2.2,0-4-1.8-4-4l0-20.9c0-1.3,0.6-2.5,1.7-3.3L24,0l18.3,12.8c1.1,0.7,1.7,2,1.7,3.3V37 C44,39.2,42.2,41,40,41z"
      ></path>
      <rect x="12" y="11" fill="#fff" width="24" height="22"></rect>
      <path
        fill="#CFD8DC"
        d="M40,41H8c-2.2,0-4-1.8-4-4l0-20l20,13l20-13v20C44,39.2,42.2,41,40,41z"
      ></path>
      <g fill="#4CAF50">
        <rect x="22" y="14" width="4" height="12"></rect>
        <rect x="18" y="18" width="12" height="4"></rect>
      </g>
    </svg>
  );
};
export const OngoingMeetingsOutlinedIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="none"
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 5.07089C16.3923 5.55612 19 8.47353 19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 9.96159 5.87128 8.12669 7.26175 6.84738L5.84658 5.43221C4.09461 7.0743 3 9.40932 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C11.662 3 11.3283 3.01863 11 3.05493V9.08551H13V5.07089Z"
        fill="currentColor"
      ></path>
      <path
        d="M7.70711 8.70708C7.31658 9.0976 7.31658 9.73077 7.70711 10.1213L10.5355 12.9497C10.9261 13.3402 11.5592 13.3402 11.9497 12.9497C12.3403 12.5592 12.3403 11.926 11.9497 11.5355L9.12132 8.70708C8.7308 8.31655 8.09763 8.31655 7.70711 8.70708Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};
export const InvitedMeetingsOutlinedIcon = ({ className }: IconProps) => {
  return (
    <svg
      stroke="currentColor"
      className={className}
      fill="currentColor"
      stroke-width="0"
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path fill="none" d="M0 0h24v24H0V0z"></path>
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V9h14v10zm0-12H5V5h14v2zm-2 5h-5v5h5v-5z"></path>
    </svg>
  );
};
export const VideoRecordingIcon = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="23"
      height="22"
      viewBox="0 0 23 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.10844 3.55469C3.10844 3.30586 3.19429 3.09554 3.36599 2.92373C3.5377 2.75192 3.74789 2.66601 3.99656 2.66601H18.2066C18.4552 2.66601 18.6654 2.75192 18.8371 2.92373C19.0088 3.09554 19.0947 3.30586 19.0947 3.55469V17.7734C19.0947 18.0223 19.0088 18.2326 18.8371 18.4044C18.6654 18.5762 18.4552 18.6621 18.2066 18.6621H3.99656C3.74789 18.6621 3.5377 18.5762 3.36599 18.4044C3.19429 18.2326 3.10844 18.0223 3.10844 17.7734V3.55469ZM4.88469 4.44336V16.8848H17.3184V4.44336H4.88469ZM9.87595 7.48262L14.21 10.3619C14.2929 10.4212 14.3432 10.4982 14.361 10.593C14.3787 10.6878 14.3639 10.7766 14.3166 10.8596C14.2811 10.8951 14.2455 10.9307 14.21 10.9662L9.87595 13.8455C9.79306 13.9048 9.70425 13.9255 9.60951 13.9077C9.51478 13.8899 9.43781 13.8396 9.3786 13.7566C9.34308 13.6974 9.32531 13.6322 9.32531 13.5611V7.76699C9.32531 7.6722 9.36084 7.58926 9.43189 7.51816C9.50294 7.44707 9.58583 7.41152 9.68056 7.41152C9.75161 7.41152 9.81674 7.43522 9.87595 7.48262Z"
        fill="currentColor"
      />
    </svg>
  );
};
export const AIChatIcon = ({ className }: IconProps) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.2002 18V11C4.2002 9.34315 5.54334 8 7.20019 8H16.8002C18.4571 8 19.8002 9.34315 19.8002 11V18C19.8002 19.6569 18.4571 21 16.8002 21H7.2002C5.54334 21 4.2002 19.6569 4.2002 18Z"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path d="M12 5L12 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      <path
        d="M20 12H21C22.1046 12 23 12.8954 23 14V15.4459C23 16.2637 22.5021 16.9992 21.7428 17.3029L20 18"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="M4 12H3C1.89543 12 1 12.8954 1 14V15.4459C1 16.2637 1.4979 16.9992 2.25722 17.3029L4 18"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M16.0004 11.15C16.4698 11.15 16.8504 11.5306 16.8504 12V14C16.8504 14.4695 16.4698 14.85 16.0004 14.85C15.5309 14.85 15.1504 14.4695 15.1504 14V12C15.1504 11.5306 15.5309 11.15 16.0004 11.15Z"
        fill="currentColor"
      />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M8.00039 11.15C8.46983 11.15 8.85039 11.5306 8.85039 12V14C8.85039 14.4695 8.46983 14.85 8.00039 14.85C7.53095 14.85 7.15039 14.4695 7.15039 14V12C7.15039 11.5306 7.53095 11.15 8.00039 11.15Z"
        fill="currentColor"
      />
      <circle cx="12" cy="3" r="2" fill="currentColor" />
      <path d="M10 17H14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      <path d="M22 12V10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
      <path d="M2 12V10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
    </svg>
  );
};
export const SquareCode = ({ className }: IconProps) => {
  return (
    <svg
      data-v-15b35c9e=""
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m10 9-3 3 3 3"></path>
      <path d="m14 15 3-3-3-3"></path>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    </svg>
  );
};
export const TelegramIcon = ({ className }: IconProps) => (
  <svg
    width="24"
    height="24"
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clip-path="url(#clip0_6570_1774)">
      <path
        d="M12 0C5.37253 0 0 5.37253 0 12C0 18.6275 5.37253 24 12 24C18.6275 24 24 18.6275 24 12C24 5.37253 18.6275 0 12 0Z"
        fill="#40B3E0"
      />
      <path
        d="M17.8388 6.90272L15.6954 17.709C15.6954 17.709 15.3957 18.4584 14.5714 18.0987L9.62532 14.3067L7.82682 13.4375L4.79926 12.4182C4.79926 12.4182 4.33463 12.2534 4.28963 11.8937C4.24473 11.534 4.81426 11.3392 4.81426 11.3392L16.8495 6.61791C16.8495 6.61791 17.8388 6.18328 17.8388 6.90272Z"
        fill="white"
      />
      <path
        d="M9.24452 17.5877C9.24452 17.5877 9.10014 17.5742 8.92023 17.0046C8.74042 16.4351 7.82617 13.4375 7.82617 13.4375L15.0953 8.82126C15.0953 8.82126 15.515 8.56645 15.5 8.82126C15.5 8.82126 15.5749 8.86616 15.3501 9.07598C15.1253 9.28588 9.63967 14.2169 9.63967 14.2169"
        fill="#D2E5F1"
      />
      <path
        d="M11.5227 15.7606L9.56634 17.5443C9.56634 17.5443 9.41344 17.6604 9.24609 17.5876L9.62072 14.2744"
        fill="#B5CFE4"
      />
    </g>
    <defs>
      <clipPath id="clip0_6570_1774">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
);
export const FileCheckIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"></path>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
    <path d="m3 15 2 2 4-4"></path>
  </svg>
);
export const BoxBrandsIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85" />
    <path d="m7 16.5 5-3" />
    <path d="M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3" />
    <path d="m17 16.5 4.74-2.85" />
    <path d="M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15" />
    <path d="m12 8 4.74-2.85" />
    <path d="M12 13.5V8" />
  </svg>
);
export const AIBrainIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M9 13a4.5 4.5 0 0 0 3-4" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M6 18a4 4 0 0 1-1.967-.516" />
    <path d="M12 13h4" />
    <path d="M12 18h6a2 2 0 0 1 2 2v1" />
    <path d="M12 8h8" />
    <path d="M16 8V5a2 2 0 0 1 2-2" />
    <circle cx="16" cy="13" r=".5" />
    <circle cx="18" cy="3" r=".5" />
    <circle cx="20" cy="21" r=".5" />
    <circle cx="20" cy="8" r=".5" />
  </svg>
);
export const GlobeIcon = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

export const Disc = ({ className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);
