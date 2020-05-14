import { LANG_EN_TRANS } from './lang-en';
import { LANG_TH_TRANS } from './lang-th';

export class Translation {
    private static translations: any = {
        'en': LANG_EN_TRANS,
        'th': LANG_TH_TRANS
    };

    public static translate(key: string, lang: string = 'th'): string {
        let translation = key;
    
        if (this.translations[lang] && this.translations[lang][key]) {
            return this.translations[lang][key];
        }
    
        return translation;
    };
}