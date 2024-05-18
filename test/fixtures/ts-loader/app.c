#include "app.tsx.h"
#include "app.h"

typedef struct {
        MyButton_react_t base;
        // Add additional states to your component here
        // ...
} MyButton_t;

static void MyButton_init(ui_widget_t *w)
{
        ui_widget_add_data(w, MyButton_proto, sizeof(MyButton_t));
        MyButton_react_init(w);
        // Write the initialization code for your component here
        // such as state initialization, event binding, etc
        // ...
}

static void MyButton_destroy(ui_widget_t *w)
{
        // Write code here to destroy the relevant resources of the component
        // ...

        MyButton_react_destroy(w);
}

void MyButton_update(ui_widget_t *w)
{
        MyButton_react_update(w);
        // Write code here to update other content of your component
        // ...
}

ui_widget_t *ui_create_MyButton(void)
{
        return ui_create_widget_with_prototype(MyButton_proto);
}

void ui_register_MyButton(void)
{
        MyButton_init_prototype();
        MyButton_proto->init = MyButton_init;
        MyButton_proto->destroy = MyButton_destroy;
}


typedef struct {
        App_react_t base;
        // Add additional states to your component here
        // ...
} App_t;

static void App_init(ui_widget_t *w)
{
        ui_widget_add_data(w, App_proto, sizeof(App_t));
        App_react_init(w);
        // Write the initialization code for your component here
        // such as state initialization, event binding, etc
        // ...
}

static void App_destroy(ui_widget_t *w)
{
        // Write code here to destroy the relevant resources of the component
        // ...

        App_react_destroy(w);
}

void App_update(ui_widget_t *w)
{
        App_react_update(w);
        // Write code here to update other content of your component
        // ...
}

ui_widget_t *ui_create_App(void)
{
        return ui_create_widget_with_prototype(App_proto);
}

void ui_register_App(void)
{
        App_init_prototype();
        App_proto->init = App_init;
        App_proto->destroy = App_destroy;
}
