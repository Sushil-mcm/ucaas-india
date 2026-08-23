import CheckIcon from '@/assets/images/Check.svg';

export const PASSWORD_RULES = {
  minLength: {
    regex: /^.{8,}$/,
    message: 'At least 8 characters',
  },
  lowercase: {
    regex: /[a-z]/,
    message: 'At least one lowercase letter',
  },
  uppercase: {
    regex: /[A-Z]/,
    message: 'At least one uppercase letter',
  },
  number: {
    regex: /\d/,
    message: 'At least one number',
  },
  specialChar: {
    regex: /[@$!%*?&]/,
    message: 'At least one special character',
  },
  noSpaces: {
    regex: /^\S*$/,
    message: 'No spaces allowed',
  },
};

const PasswordRulesIndicator = ({ password }: any) => {
  const ruleStatus: Record<string, boolean> = Object.entries(PASSWORD_RULES).reduce(
    (acc, [key, rule]) => {
      acc[key] = rule.regex.test(password || '');
      return acc;
    },
    {} as Record<string, boolean>,
  );

  return (
    <ul className="list-inside text-sm font-medium flex flex-col gap-2 pb-1.5 transition-all">
      {Object.entries(PASSWORD_RULES).map(([key, rule]) => (
        <li
          key={key}
          className={`flex items-center gap-2 transition-all ${ruleStatus[key] ? 'text-green-400' : 'text-gray-300'}`}
        >
          <img
            src={CheckIcon}
            alt="checkIcon"
            className={`w-4 h-4 transition-opacity ${ruleStatus[key] ? 'opacity-100' : 'opacity-30'}`}
          />
          {rule.message}
        </li>
      ))}
    </ul>
  );
};

export default PasswordRulesIndicator;
