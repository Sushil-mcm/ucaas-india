import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type PermissionNode = boolean | PermissionObject;

interface PermissionObject {
  [key: string]: PermissionNode;
}

interface FeatureNode {
  access?: PermissionObject;
  action?: PermissionObject;
  IS_SHOW?: boolean;
  [key: string]: any;
}

interface PermissionsAccordionProps {
  companyJson: Record<string, FeatureNode>;
  userJson: Record<string, any>;
  readOnly?: boolean;
}

/* ---------------- HELPERS ---------------- */

const getUserPermissionValue = (userJson: any, path: string[], fallback = false): boolean => {
  return (
    path.reduce((acc, key) => {
      if (acc && typeof acc === 'object') {
        return acc[key];
      }
      return undefined;
    }, userJson) ?? fallback
  );
};

const updateUserPermissionByPath = (source: any, path: string[], value: boolean) => {
  const cloned = structuredClone(source);
  let current = cloned;

  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) current[path[i]] = {};
    current = current[path[i]];
  }

  current[path[path.length - 1]] = value;
  return cloned;
};

/* ---------------- PERMISSION TREE ---------------- */

const PermissionTree = ({
  companyData,
  userData,
  basePath,
  readOnly,
  onToggle,
  lockAccessValues = false,
}: {
  companyData: PermissionObject;
  userData: Record<string, any>;
  basePath: string[];
  readOnly: boolean;
  onToggle?: (path: string[], value: boolean) => void;
  lockAccessValues?: boolean;
}) => {
  const entries = Object.entries(companyData);
  const sortedEntries = entries.sort(([keyA, valueA], [keyB, valueB]) => {
    if (keyA === 'IS_SHOW') return 1;
    if (keyB === 'IS_SHOW') return -1;

    const aIsBoolean = typeof valueA === 'boolean';
    const bIsBoolean = typeof valueB === 'boolean';

    if (keyA === 'view') return -1;
    if (keyB === 'view') return 1;

    if (aIsBoolean && !bIsBoolean) return -1;
    if (!aIsBoolean && bIsBoolean) return 1;

    return 0;
  });

  const hasView = 'view' in companyData;
  const viewPath = [...basePath, 'view'];
  const isViewChecked = hasView ? getUserPermissionValue(userData, viewPath, false) : true;

  return (
    <div className="space-y-2">
      {sortedEntries.map(([key, value]) => {
        if (key === 'IS_SHOW') return null;

        const currentPath = [...basePath, key];

        if (typeof value === 'boolean') {
          const checked = getUserPermissionValue(userData, currentPath);
          const isInsideAction = basePath.includes('action');
          let disabled = readOnly || (lockAccessValues && !isInsideAction);

          if (hasView && key !== 'view' && !isViewChecked) {
            disabled = true;
          }

          return (
            <div key={currentPath.join('.')} className="flex items-start gap-3">
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(v) => onToggle?.(currentPath, Boolean(v))}
                className="mt-0.5 shrink-0"
              />
              <Label
                className={`capitalize leading-5 break-words ${disabled ? 'text-muted-foreground' : ''}`}
              >
                {key.replace(/_/g, ' ')}
              </Label>
            </div>
          );
        }

        return (
          <div key={currentPath.join('.')} className="ml-3 space-y-2 sm:ml-4">
            {typeof value === 'object' && Object.keys(value).length > 0 && key !== 'action' && (
              <p className="font-medium capitalize break-words">{key.replace(/_/g, ' ')}</p>
            )}
            {/* If 'view' is unchecked, should we disable children objects? 
                The user said "other keys of that object". Usually applies to actions. 
                If we want to cascade disable to children objects (like 'greeting' inside 'action'), 
                we can pass a 'disabled' prop or modify readOnly. 
                For now, let's treat nested objects as 'other keys'.
            */}
            <PermissionTree
              companyData={value as PermissionObject}
              userData={userData}
              basePath={currentPath}
              readOnly={
                // If view is unchecked at this level, disable children?
                // However, strictly speaking, 'view' at `action` level controls `action` level keys.
                // Nested objects might have their own 'view'.
                // If this KEY is not 'view' and 'view' is unchecked, we disable.
                hasView && key !== 'view' && !isViewChecked ? true : readOnly
              }
              onToggle={onToggle}
              lockAccessValues={lockAccessValues}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */

export const PermissionsAccordion = ({
  companyJson,
  userJson,
  readOnly = false,
}: PermissionsAccordionProps) => {
  const { setValue } = useFormContext();
  const [userPermissions, setUserPermissions] = useState(userJson);

  const features = Object.entries(companyJson || {}) as [string, FeatureNode][];
  const firstFeatureKey = features[0]?.[0];
  const [openItems, setOpenItems] = useState<string[]>(firstFeatureKey ? [firstFeatureKey] : []);

  useEffect(() => {
    setUserPermissions(userJson);
  }, [userJson]);

  useEffect(() => {
    setValue('permission', userPermissions, { shouldDirty: true, shouldTouch: true });
  }, [userPermissions, setValue]);

  const handleToggle = (path: string[], value: boolean) => {
    setUserPermissions((prev) => {
      const newData = updateUserPermissionByPath(prev, path, value);

      // If 'view' is unchecked, uncheck all boolean siblings
      const key = path[path.length - 1];
      if (key === 'view' && value === false) {
        const parentPath = path.slice(0, -1);

        // Traverse to parent object in newData
        let current = newData;
        for (const segment of parentPath) {
          if (current[segment]) {
            current = current[segment];
          } else {
            current = null;
            break;
          }
        }

        if (current && typeof current === 'object') {
          Object.keys(current).forEach((siblingKey) => {
            if (siblingKey !== 'view' && typeof current[siblingKey] === 'boolean') {
              current[siblingKey] = false;
            }
          });
        }
      }

      return newData;
    });
  };

  return (
    <>
      <Accordion
        type="multiple"
        value={openItems}
        onValueChange={setOpenItems}
        className="flex w-full flex-col gap-2"
      >
        {features.map(([featureKey, featureValue]) => {
          if (featureValue?.IS_SHOW === false) return null;

          return (
            <AccordionItem
              key={featureKey}
              value={featureKey}
              className="border rounded-lg border-gray-200"
            >
              <AccordionTrigger
                variant="default"
                className="bg-gray-50 px-3 py-4 text-left text-sm font-semibold uppercase text-gray-900 hover:no-underline sm:px-4"
              >
                {featureKey.replace(/_/g, ' ')}
              </AccordionTrigger>

              <AccordionContent className="space-y-6 pt-0">
                {featureValue.access && (
                  <div className="p-3 pb-0 sm:p-4 sm:pb-0">
                    <p className="font-semibold mb-3">Access</p>
                    <PermissionTree
                      companyData={featureValue.access}
                      userData={userPermissions}
                      basePath={[featureKey, 'access']}
                      readOnly={readOnly}
                      lockAccessValues={featureKey !== 'phone_system_action'}
                      onToggle={handleToggle}
                    />
                  </div>
                )}

                {featureValue.action && (
                  <div className="p-3 sm:p-4">
                    <p className="font-semibold mb-3">Actions</p>
                    <PermissionTree
                      companyData={featureValue.action}
                      userData={userPermissions}
                      basePath={[featureKey, 'action']}
                      readOnly={readOnly}
                      onToggle={handleToggle}
                    />
                  </div>
                )}

                {/* Render nested siblings */}
                {Object.entries(featureValue)
                  .filter(([key]) => !['access', 'action', 'IS_SHOW'].includes(key))
                  .map(([nestedKey, nestedValue]) => (
                    <div key={nestedKey} className="p-3 sm:p-4">
                      <p className="font-semibold mb-3 capitalize">
                        {nestedKey.replace(/_/g, ' ')}
                      </p>
                      <PermissionTree
                        companyData={nestedValue as PermissionObject}
                        userData={userPermissions}
                        basePath={[featureKey, nestedKey]}
                        readOnly={readOnly}
                        onToggle={handleToggle}
                      />
                    </div>
                  ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};
