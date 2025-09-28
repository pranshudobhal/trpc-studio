import * as React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Globe,
  ChevronDown,
  Copy,
  Download,
  Upload,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { EnvironmentManager } from '../lib/environment-manager';

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  withCredentials: boolean;
}

export interface EnvironmentSelectorProps {
  selectedEnvironment?: Environment;
  onEnvironmentChange: (environment: Environment) => void;
  className?: string;
}

export function EnvironmentSelector({
  selectedEnvironment,
  onEnvironmentChange,
  className,
}: EnvironmentSelectorProps) {
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [isManageDialogOpen, setIsManageDialogOpen] = React.useState(false);

  // Load environments from localStorage on mount
  React.useEffect(() => {
    const loadedEnvironments = EnvironmentManager.loadEnvironments();
    setEnvironments(loadedEnvironments);
  }, []);

  // Set default environment if none selected
  React.useEffect(() => {
    if (!selectedEnvironment && environments.length > 0) {
      onEnvironmentChange(environments[0]);
    }
  }, [environments, selectedEnvironment, onEnvironmentChange]);

  const handleEnvironmentSelect = (environmentId: string) => {
    const env = environments.find(e => e.id === environmentId);
    if (env) {
      onEnvironmentChange(env);
    }
  };

  const handleCopyAsCurl = () => {
    if (!selectedEnvironment) return;

    const curlCommand =
      EnvironmentManager.generateCurlCommand(selectedEnvironment);
    navigator.clipboard.writeText(curlCommand);
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {/* Environment Selector */}
      <Select
        value={selectedEnvironment?.id}
        onValueChange={handleEnvironmentSelect}
      >
        <SelectTrigger className="w-40">
          <div className="flex items-center space-x-2">
            <Globe className="h-3 w-3" />
            <SelectValue placeholder="Select environment" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {environments.map(env => (
            <SelectItem key={env.id} value={env.id}>
              <div className="flex items-center justify-between w-full">
                <span>{env.name}</span>
                <Badge variant="outline" className="text-xs ml-2">
                  {new URL(env.baseUrl).hostname}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-9 p-0">
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsManageDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Environments
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyAsCurl}>
            <Copy className="h-4 w-4 mr-2" />
            Copy as cURL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Manage Environments Dialog */}
      <EnvironmentManagerDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        environments={environments}
        onEnvironmentsChange={setEnvironments}
        selectedEnvironment={selectedEnvironment}
        onEnvironmentChange={onEnvironmentChange}
      />
    </div>
  );
}

interface EnvironmentManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environments: Environment[];
  onEnvironmentsChange: (environments: Environment[]) => void;
  selectedEnvironment?: Environment;
  onEnvironmentChange: (environment: Environment) => void;
}

function EnvironmentManagerDialog({
  open,
  onOpenChange,
  environments,
  onEnvironmentsChange,
  selectedEnvironment,
  onEnvironmentChange,
}: EnvironmentManagerDialogProps) {
  const [editingEnvironment, setEditingEnvironment] =
    React.useState<Environment | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const handleDeleteEnvironment = (id: string) => {
    const newEnvironments = EnvironmentManager.deleteEnvironment(
      environments,
      id
    );
    onEnvironmentsChange(newEnvironments);

    // If we deleted the selected environment, select the first one
    if (selectedEnvironment?.id === id && newEnvironments.length > 0) {
      onEnvironmentChange(newEnvironments[0]);
    }
  };

  const handleUpdateEnvironment = (
    updatedEnv: Environment | Omit<Environment, 'id'>
  ) => {
    // If updatedEnv doesn't have an id, it's a new environment
    if (!('id' in updatedEnv) || !updatedEnv.id) {
      const newEnvironments = EnvironmentManager.createEnvironment(
        environments,
        updatedEnv
      );
      onEnvironmentsChange(newEnvironments);
      return;
    }

    const newEnvironments = EnvironmentManager.updateEnvironment(
      environments,
      updatedEnv.id,
      updatedEnv as Environment
    );
    onEnvironmentsChange(newEnvironments);

    // Update selected environment if it was the one being edited
    if (selectedEnvironment?.id === updatedEnv.id) {
      onEnvironmentChange(updatedEnv as Environment);
    }

    setEditingEnvironment(null);
  };

  const handleCreateEnvironment = (newEnv: Omit<Environment, 'id'>) => {
    const newEnvironments = EnvironmentManager.createEnvironment(
      environments,
      newEnv
    );
    onEnvironmentsChange(newEnvironments);
    setIsCreateDialogOpen(false);
  };

  const handleExport = () => {
    const data = EnvironmentManager.exportEnvironments(environments);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trpc-studio-environments.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const imported = EnvironmentManager.importEnvironments(
          e.target?.result as string
        );
        onEnvironmentsChange(imported);
      } catch (error) {
        console.error('Failed to import environments:', error);
        // TODO: Show user-friendly error message
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Environments</DialogTitle>
            <DialogDescription>
              Configure different environments for testing your tRPC API
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Environment
              </Button>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <label>
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Environment List */}
            <div className="space-y-2">
              {environments.map(env => (
                <EnvironmentCard
                  key={env.id}
                  environment={env}
                  isSelected={selectedEnvironment?.id === env.id}
                  onEdit={() => setEditingEnvironment(env)}
                  onDelete={() => handleDeleteEnvironment(env.id)}
                  onSelect={() => onEnvironmentChange(env)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Environment Dialog */}
      <EnvironmentEditDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSave={handleCreateEnvironment}
        title="Create Environment"
      />

      {/* Edit Environment Dialog */}
      <EnvironmentEditDialog
        open={!!editingEnvironment}
        onOpenChange={open => !open && setEditingEnvironment(null)}
        environment={editingEnvironment || undefined}
        onSave={handleUpdateEnvironment}
        title="Edit Environment"
      />
    </>
  );
}

interface EnvironmentCardProps {
  environment: Environment;
  isSelected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

function EnvironmentCard({
  environment,
  isSelected,
  onEdit,
  onDelete,
  onSelect,
}: EnvironmentCardProps) {
  return (
    <div
      className={cn(
        'p-3 border rounded-lg cursor-pointer transition-colors',
        isSelected
          ? 'border-primary bg-accent'
          : 'border-border hover:bg-accent'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-medium">{environment.name}</h4>
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{environment.baseUrl}</p>
          {Object.keys(environment.headers).length > 0 && (
            <p className="text-xs text-muted-foreground">
              {Object.keys(environment.headers).length} custom header(s)
            </p>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onEdit();
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EnvironmentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment?: Environment;
  onSave: (environment: Environment | Omit<Environment, 'id'>) => void;
  title: string;
}

function EnvironmentEditDialog({
  open,
  onOpenChange,
  environment,
  onSave,
  title,
}: EnvironmentEditDialogProps) {
  const [formData, setFormData] = React.useState<Environment>({
    id: '',
    name: '',
    baseUrl: '',
    headers: {},
    withCredentials: false,
  });

  const [headerKey, setHeaderKey] = React.useState('');
  const [headerValue, setHeaderValue] = React.useState('');

  React.useEffect(() => {
    if (environment) {
      setFormData(environment);
    } else {
      setFormData({
        id: `env_${Date.now()}`,
        name: '',
        baseUrl: '',
        headers: {},
        withCredentials: false,
      });
    }
  }, [environment, open]);

  const handleSave = () => {
    const errors = EnvironmentManager.validateEnvironment(formData);
    if (errors.length > 0) {
      // TODO: Show validation errors to user
      console.error('Validation errors:', errors);
      return;
    }

    onSave(formData);
    onOpenChange(false);
  };

  const handleAddHeader = () => {
    if (!headerKey || !headerValue) return;

    setFormData(prev => ({
      ...prev,
      headers: {
        ...prev.headers,
        [headerKey]: headerValue,
      },
    }));

    setHeaderKey('');
    setHeaderValue('');
  };

  const handleRemoveHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return {
        ...prev,
        headers: newHeaders,
      };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={e =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              placeholder="Environment name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL</label>
            <Input
              value={formData.baseUrl}
              onChange={e =>
                setFormData(prev => ({ ...prev, baseUrl: e.target.value }))
              }
              placeholder="https://api.example.com"
            />
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Headers</label>

            {/* Add Header */}
            <div className="flex space-x-2">
              <Input
                placeholder="Header name"
                value={headerKey}
                onChange={e => setHeaderKey(e.target.value)}
              />
              <Input
                placeholder="Header value"
                value={headerValue}
                onChange={e => setHeaderValue(e.target.value)}
              />
              <Button
                type="button"
                onClick={handleAddHeader}
                disabled={!headerKey || !headerValue}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Header List */}
            {Object.entries(formData.headers).length > 0 && (
              <div className="space-y-1 max-h-32 overflow-auto">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <code className="text-sm">
                      {key}: {value}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveHeader(key)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credentials */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="withCredentials"
              checked={formData.withCredentials}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  withCredentials: e.target.checked,
                }))
              }
              className="h-4 w-4"
            />
            <label htmlFor="withCredentials" className="text-sm">
              Send cookies and credentials
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name || !formData.baseUrl}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
