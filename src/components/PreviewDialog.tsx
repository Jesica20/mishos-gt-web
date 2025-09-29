import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useState } from "react";

type PreviewDialogProps = {
  url: string;
  title: string;
  isPDF: boolean;
  trigger: React.ReactNode; // lo que se va a tocar/clickear (la miniatura)
};

export function PreviewDialog({ url, title, isPDF, trigger }: PreviewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* lo que recibimos como miniatura */}
        {trigger}
      </DialogTrigger>

      {/* Dialog fullscreen-ish en mobile, centrado en desktop */}
      <DialogContent className="p-0 max-w-[95vw] sm:max-w-[900px]">
        <div className="w-full h-[85vh] sm:h-[80vh]">
          <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
          {isPDF ? (
            // Iframe para PDF (con fallback de abrir en pestaña)
            <iframe
              title={title}
              src={`${url}#view=FitH`}
              className="w-full h-full"
            />
          ) : (
            <img
              src={url}
              alt={title}
              className="mx-auto h-full max-h-full w-auto object-contain"
            />
          )}
        </div>
        {/* Fallback para iOS Safari o si el visor no carga */}
        <div className="px-4 py-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline"
          >
            Abrir en nueva pestaña
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}