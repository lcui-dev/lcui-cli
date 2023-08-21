/** This file is generated from home.xml */

#include <ui.h>

typedef struct {
        ui_widget_t *input_message;
        ui_widget_t *btn_save_message;
        ui_widget_t *feedback;
} home_refs_t;

static const char *css_str_0 = "\
root {\
  background-color: #f6f8fa;\
}\
\
.feedback {\
  color: #28a745;\
  font-size: 12px;\
  margin-top: 5px;\
}\
\
";


static void home_load_template(ui_widget_t *parent, home_refs_t *refs)
{
        ui_widget_t *w[5];

        w[0] = ui_create_widget(NULL);
        w[1] = ui_create_widget("text");
        w[2] = ui_create_widget(NULL);
        ui_widget_set_text(w[2], "Enter a message and save it.");
        ui_widget_append(w[1], w[2]);
        refs->input_message = ui_create_widget("textedit");
        ui_widget_set_attr(refs->input_message, "placeholder", "eg: hello, world!");
        refs->btn_save_message = ui_create_widget("button");
        w[3] = ui_create_widget(NULL);
        ui_widget_set_text(w[3], "Save");
        ui_widget_append(refs->btn_save_message, w[3]);
        refs->feedback = ui_create_widget("text");
        ui_widget_add_class(refs->feedback, "feedback");
        w[4] = ui_create_widget(NULL);
        ui_widget_set_text(w[4], "Message has been saved!");
        ui_widget_append(refs->feedback, w[4]);
        ui_widget_append(parent, w[1]);
        ui_widget_append(parent, refs->input_message);
        ui_widget_append(parent, refs->btn_save_message);
        ui_widget_append(parent, refs->feedback);
        ui_widget_append(parent, parent);
        ui_widget_append(w[0], parent);
}

static void home_load_resources(void)
{
        ui_load_css_string(css_str_0, "home.css");
        pd_font_library_load_file("iconfont.ttf");
}
