
export class EmailTemplateModel {
    path: string;
    data: any;
}

export class EmailModel {
    to: string;
    title: string;
    message: string | EmailTemplateModel;

    constructor(to: string, title: string, message: string | EmailTemplateModel) {
        this.to = to;
        this.title = title;
        this.message = message;
    }
}