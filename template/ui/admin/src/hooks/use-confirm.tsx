import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    type ReactNode
} from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({});
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback<ConfirmFn>((opts) => {
        setOptions(opts);
        setOpen(true);

        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    function handleClose(result: boolean) {
        setOpen(false);
        resolveRef.current?.(result);
        resolveRef.current = null;
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(false); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {options.title || 'Confirmação'}
                        </DialogTitle>
                        {options.description && (
                            <DialogDescription>
                                {options.description}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => handleClose(false)}
                        >
                            {options.cancelLabel || 'Cancelar'}
                        </Button>
                        <Button
                            variant={options.variant || 'default'}
                            onClick={() => handleClose(true)}
                        >
                            {options.confirmLabel || 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm(): ConfirmFn {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
}
