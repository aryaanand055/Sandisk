`timescale 1ns / 1ps
module led_blinker_tb_slow;
    reg clk;
    reg reset;
    wire led;

    led_blinker #( .BLINK_PERIOD(200) ) slow_uut (
        .clk(clk),
        .reset(reset),
        .led(led)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        reset = 1; #10 reset = 0;
        #5000 $finish;
    end
endmodule
