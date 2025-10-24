'use client';

import { useEffect, useState } from 'react';
import { getTemplatesAction, deleteTemplateAction } from '@/lib/db/actions';
import { Button } from '@/components/ui/button';
import { TemplateEditorModal } from '@/app/components/template-editor-modal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: number;
  name: string;
  subject: string | null;
  body: string | null;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = async () => {
    setIsLoading(true);
    const result = await getTemplatesAction();
    if (result.success && result.data) {
      setTemplates(result.data);
      setError(null);
    } else {
      setError(result.error || 'An unknown error occurred.');
    }
    setIsLoading(false);
  };

  useEffect(() => { loadTemplates(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const result = await deleteTemplateAction(id);
    if (result.success) {
      toast.success('Template deleted!');
      loadTemplates();
    } else {
      toast.error(result.error || 'Failed to delete template.');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manage Templates</h1>
          <p className="text-muted-foreground">Create, edit, and delete your email templates.</p>
        </div>

        <TemplateEditorModal onActionComplete={loadTemplates} trigger={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Template
          </Button>
        } />
      </div>

      {isLoading && <p>Loading templates...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.length > 0 ? (
            templates.map((template) => (
              <div
                key={template.id}
                className="border rounded p-6 flex justify-between items-center min-h-[100px]"
              >
                <div>
                  <p className="font-semibold text-lg">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.subject || 'No Subject'}</p>
                </div>
                <div className="flex gap-2">
                  <TemplateEditorModal template={template} onActionComplete={loadTemplates} trigger={
                    <Button size="sm" variant="outline">
                      <Edit className="mr-1 h-4 w-4" /> Edit
                    </Button>
                  } />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p>You haven't created any templates yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
